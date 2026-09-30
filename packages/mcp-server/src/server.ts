import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { SecurityContext, PolicyEngine } from '@continuum/security';
import { MemoryService, MemoryRetrieval, MemoryDeduplicator, HeuristicConflictDetector, MockEmbeddingProvider } from '@continuum/memory-service';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export async function startServer(port: number) {
  const app = express();
  app.use(cors());

  // OAuth Middleware
  app.use((req, res, next) => {
    // In dev, we accept a hardcoded test token if JWT secret is 'test_secret'
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = auth.substring(7);
    try {
      // For local CI/dev, we use a simple synchronous JWT verification.
      // In production, this would use jwks-rsa to verify against an IdP.
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret') as any;
      
      // Inject security context
      (req as any).securityContext = {
        identityId: decoded.sub || 'anonymous',
        role: decoded.role || 'admin',
        workspaceId: decoded.workspaceId || 'default_workspace',
        connectionId: decoded.client_id || decoded.connection_id
      } as SecurityContext;
      
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Setup Continuum Services
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://localhost/continuum' });
  const db = drizzle(pool);
  const embedder = new MockEmbeddingProvider();
  const dedupe = new MemoryDeduplicator(db, embedder);
  const conflict = new HeuristicConflictDetector();
  const memoryService = new MemoryService(db, embedder, dedupe, conflict);
  const retrieval = new MemoryRetrieval(db, embedder);

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
        // Stub implementation — will be replaced in M7 with real brief generation
        const brief = `[System Brief for ${projectId}]\nUse PostgreSQL. Use React. Enforce WCAG 2.2 AA.`;
        return {
          content: [{ type: "text", text: brief }]
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

  return new Promise<void>((resolve) => {
    app.listen(port, () => {
      resolve();
    });
  });
}

