"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

export default function MemoryExplorer({ params }: { params: { projectId: string } }) {
  const [query, setQuery] = useState("");

  const mockMemories = [
    { id: "m_1", type: "decision", content: "Use Drizzle ORM instead of Prisma for smaller bundle size.", confidence: 0.95 },
    { id: "m_2", type: "convention", content: "Always use strict TypeScript mode and explicitly type arguments.", confidence: 0.88 },
    { id: "m_3", type: "constraint", content: "The MCP server must run on port 3000.", confidence: 1.0 },
  ];

  return (
    <div className="container mx-auto py-10 max-w-5xl h-screen flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Explorer</h1>
          <p className="text-muted-foreground mt-1">Project: {params.projectId}</p>
        </div>
      </div>

      <div className="flex space-x-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9" 
            placeholder="Search project memories..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button>Search</Button>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="text-lg">Retrieved Context</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-6">
            <div className="space-y-4">
              {mockMemories.map(memory => (
                <div key={memory.id} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={memory.type === 'decision' ? 'default' : 'secondary'}>
                      {memory.type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Confidence: {memory.confidence.toFixed(2)}</span>
                  </div>
                  <p className="text-sm">{memory.content}</p>
                </div>
              ))}
              {mockMemories.length === 0 && (
                <div className="text-center text-muted-foreground py-10">No memories found.</div>
              )}
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    </div>
  );
}
