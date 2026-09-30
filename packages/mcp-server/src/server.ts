import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import jwt from 'jsonwebtoken';
import { SecurityContext, PolicyEngine } from '@continuum/security';
import { MemoryService, MemoryRetrieval, MemoryDeduplicator, HeuristicConflictDetector, MockEmbeddingProvider, ProjectBriefGenerator } from '@continuum/memory-service';
import { drizzle } from '@continuum/db';
import { HandoffService } from '@continuum/handoff-service';
import { ContextAssembler } from '@continuum/context-assembly';
import { Pool } from 'pg';

import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: process.env.JWKS_URI || 'https://auth.continuum.com/.well-known/jwks.json'
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

export async function startServer(port: number) {
  const app = express();
  app.use(cors());

  // OAuth Middleware
  app.use((req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = auth.substring(7);
    
    // In dev we can still support a bypass, but default to JWKS
    if (token === 'test_token') {
      (req as any).securityContext = {
        identityId: 'anonymous',
        role: 'admin',
        workspaceId: 'default_workspace',
      } as SecurityContext;
      return next();
    }

    jwt.verify(token, getKey, {}, (err, decoded: any) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Inject security context
      (req as any).securityContext = {
        identityId: decoded.sub || 'anonymous',
        role: decoded.role || 'admin',
        workspaceId: decoded.workspaceId || 'default_workspace',
        connectionId: decoded.client_id || decoded.connection_id
      } as SecurityContext;
      
      next();
    });
  });

  // Setup Continuum Services
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost/continuum' });
  const db = drizzle(pool);
  const embedder = new MockEmbeddingProvider();
  const dedupe = new MemoryDeduplicator(db, embedder);
  const conflict = new HeuristicConflictDetector();
  const memoryService = new MemoryService(db, embedder, dedupe, conflict);
  const retrieval = new MemoryRetrieval(db, embedder);
  const handoffService = new HandoffService(db);
  const briefGenerator = new ProjectBriefGenerator(db);
  const assembler = new ContextAssembler();

  // Setup MCP Server
  const server = new Server(
    { name: "continuum-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "memory.search",
          description: "Search the project's long-term memory for past decisions, constraints, and context.",
          inputSchema: {
            type: "object",
            properties: {
              projectId: { type: "string" },
              query: { type: "string", description: "The question or topic to search for" },
              limit: { type: "number", description: "Max results to return" }
            },
            required: ["projectId", "query"]
          }
        },
        {
          name: "memory.propose",
          description: "Propose a new fact, decision, or constraint to be saved in long-term memory.",
          inputSchema: {
            type: "object",
            properties: {
              projectId: { type: "string" },
              content: { type: "string", description: "The atomic fact or decision to save" },
              type: { 
                type: "string", 
                enum: ["decision", "convention", "constraint", "preference", "task_state", "learning"],
                description: "The classification of the memory item"
              }
            },
            required: ["projectId", "content", "type"]
          }
        },
        {
          name: "memory.get_brief",
          description: "Retrieve a consolidated system prompt brief containing the active architecture and convention context for a project.",
          inputSchema: {
            type: "object",
            properties: {
              projectId: { type: "string" }
            },
            required: ["projectId"]
          }
        },
        {
          name: "handoff.checkpoint",
          description: "Save the current task state into a handoff capsule so it can be resumed by another agent.",
          inputSchema: {
            type: "object",
            properties: {
              projectId: { type: "string" },
              title: { type: "string", description: "Title of the task being checkpointed" },
              state: {
                type: "object",
                properties: {
                  context: { type: "string" },
                  files: { type: "array", items: { type: "string" } },
                  nextSteps: { type: "array", items: { type: "string" } },
                  blockedOn: { type: "string" }
                },
                required: ["context", "files", "nextSteps"]
              }
            },
            required: ["projectId", "title", "state"]
          }
        },
        {
          name: "handoff.resume",
          description: "Resume a task state from a handoff capsule.",
          inputSchema: {
            type: "object",
            properties: {
              projectId: { type: "string" },
              capsuleId: { type: "string" }
            },
            required: ["projectId", "capsuleId"]
          }
        },
        {
          name: "handoff.list",
          description: "List all open task handoff capsules for a project.",
          inputSchema: {
            type: "object",
            properties: {
              projectId: { type: "string" }
            },
            required: ["projectId"]
          }
        },
        {
          name: "context.assemble",
          description: "Assemble a token-budgeted context block for the LLM, containing the Project Brief, Task Capsule, and relevant Memories.",
          inputSchema: {
            type: "object",
            properties: {
              projectId: { type: "string" },
              budget: { type: "number", description: "Maximum number of tokens to use for context." },
              query: { type: "string", description: "Query to retrieve relevant memories." },
              capsuleId: { type: "string", description: "Optional Task Capsule ID to include." }
            },
            required: ["projectId", "budget", "query"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    // Look up security context bound to this session.
    // The SSE handshake captures the JWT-verified context from the HTTP req
    // and stores it keyed by transport.sessionId.
    // Fallback to a restrictive context if lookup fails (defense-in-depth).
    const sessionId = (extra as any)?._sessionId;
    const ctx: SecurityContext = sessionContexts.get(sessionId as string) || {
      identityId: 'unknown',
      role: 'viewer',
      workspaceId: 'unknown'
    };

    const { name, arguments: args } = request.params;
    if (!args) {
      throw new Error("Arguments are required");
    }

    try {
      if (name === "memory.search") {
        const { projectId, query, limit } = args as any;
        const results = await retrieval.search(ctx, { projectId, query, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
        };
      } 
      else if (name === "memory.propose") {
        const { projectId, content, type } = args as any;
        const result = await memoryService.proposeMemory(ctx, { projectId, content, type });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      else if (name === "memory.get_brief") {
        const { projectId } = args as any;
        const brief = await briefGenerator.generateBrief(ctx, projectId);
        return {
          content: [{ type: "text", text: brief }]
        };
      }
      else if (name === "handoff.checkpoint") {
        const { projectId, title, state } = args as any;
        const result = await handoffService.checkpoint(ctx, projectId, title, state);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      else if (name === "handoff.resume") {
        const { projectId, capsuleId } = args as any;
        const result = await handoffService.resume(ctx, projectId, capsuleId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      else if (name === "handoff.list") {
        const { projectId } = args as any;
        const result = await handoffService.listOpenTasks(ctx, projectId);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      else if (name === "context.assemble") {
        const { projectId, budget, query, capsuleId } = args as any;
        
        // Fetch Brief
        const brief = await briefGenerator.generateBrief(ctx, projectId);
        
        // Fetch Memories
        const memories = await retrieval.search(ctx, { projectId, query, limit: 50 });
        
        // Fetch Capsule if provided
        let capsule = undefined;
        if (capsuleId) {
          // HandoffService doesn't have a direct 'getById' public method yet, but it retrieves the state when resuming.
          // For assembly, we only read. We will need to mock/extract from db directly or add getCapsule to handoffService.
          // Wait, we can just use `handoffService.resume`? No, resume might alter state or close it, wait! 
          // Let's add getCapsule later if needed. For now, we query the db directly.
          // Actually, let's just query db since we have drizzle instance here.
          const { taskCapsules, eq, and } = require('@continuum/db');
          const [found] = await db.select().from(taskCapsules).where(and(eq(taskCapsules.id, capsuleId), eq(taskCapsules.projectId, projectId)));
          if (found) {
            capsule = {
              title: found.title,
              state: JSON.parse(found.state)
            };
          }
        }

        const result = assembler.assemble(budget, brief, memories, capsule);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      else {
        throw new Error(`Unknown tool: ${name}`);
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: err.message }]
      };
    }
  });

  // Maps to store active transports and their bound security contexts by session ID
  const transports = new Map<string, SSEServerTransport>();
  const sessionContexts = new Map<string, SecurityContext>();

  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/message", res);
    await server.connect(transport);

    // Capture the JWT-verified security context from the HTTP request
    // and bind it to this SSE session for use in tool handlers.
    const reqCtx = (req as any).securityContext as SecurityContext | undefined;
    if (reqCtx) {
      sessionContexts.set(transport.sessionId, reqCtx);
    }

    transports.set(transport.sessionId, transport);
    
    req.on("close", () => {
      transports.delete(transport.sessionId);
      sessionContexts.delete(transport.sessionId);
    });
  });

  app.post("/message", express.json(), async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      return res.status(404).send("Session not found");
    }
    await transport.handlePostMessage(req, res);
  });

  app.get("/api/brief", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      if (!projectId) return res.status(400).json({ error: 'Missing projectId' });
      
      const ctx = (req as any).securityContext as SecurityContext;
      const brief = await briefGenerator.generateBrief(ctx, projectId);
      res.type('text/plain').send(brief);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      resolve();
    });
  });
}

