"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ArrowRight } from "lucide-react";

export default function InboxPage({ params }: { params: { projectId: string } }) {
  const [proposals, setProposals] = useState([
    {
      id: "prop_1",
      type: "decision",
      content: "Use Playwright for all E2E testing.",
      confidence: 0.92,
      conflict: null,
    },
    {
      id: "prop_2",
      type: "convention",
      content: "Always wrap async calls in try/catch.",
      confidence: 0.75,
      conflict: {
        existingId: "m_55",
        existingContent: "Use global error boundaries for async calls.",
      },
    }
  ]);

  const handleApprove = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReject = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Proposal Inbox</h1>
        <p className="text-muted-foreground mt-2">
          Review newly extracted memories and resolve conflicts for project: <span className="font-mono bg-muted px-1 py-0.5 rounded text-sm">{params.projectId}</span>
        </p>
      </div>

      <div className="grid gap-6">
        {proposals.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground border rounded-lg bg-muted/20">
            Inbox is zero! All caught up.
          </div>
        ) : (
          proposals.map((proposal) => (
            <Card key={proposal.id} className={proposal.conflict ? "border-amber-500/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Badge variant={proposal.type === "decision" ? "default" : "secondary"}>
                        {proposal.type.toUpperCase()}
                      </Badge>
                      {proposal.conflict && (
                        <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">
                          Conflict Detected
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Confidence: {(proposal.confidence * 100).toFixed(0)}%</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {proposal.conflict ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Existing Memory</p>
                      <p className="text-sm">{proposal.conflict.existingContent}</p>
                    </div>
                    <div className="flex items-center justify-center hidden md:flex absolute left-1/2 -translate-x-1/2 translate-y-10">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-semibold text-primary mb-2 uppercase">Proposed Update</p>
                      <p className="text-sm">{proposal.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm">{proposal.content}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-3 pt-4 border-t bg-muted/20">
                <Button variant="outline" onClick={() => handleReject(proposal.id)} className="gap-2">
                  <X className="h-4 w-4" />
                  Reject
                </Button>
                <Button onClick={() => handleApprove(proposal.id)} className="gap-2">
                  <Check className="h-4 w-4" />
                  {proposal.conflict ? "Approve & Supersede" : "Approve"}
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
