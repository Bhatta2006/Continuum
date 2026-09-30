"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, Database, AlertCircle, Inbox, Clock } from "lucide-react";

export default function HealthDashboard({ params }: { params: { projectId: string } }) {
  const metrics = {
    totalMemories: 1452,
    staleMemories: 45,
    pendingProposals: 2,
    conflicts: 1,
    avgConfidence: 0.88,
  };

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Health Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Memory metrics and system health for project: <span className="font-mono bg-muted px-1 py-0.5 rounded text-sm">{params.projectId}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalMemories}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stale Memories</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.staleMemories}</div>
            <p className="text-xs text-muted-foreground mt-1">Not accessed in >30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Inbox</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingProposals}</div>
            <p className="text-xs text-muted-foreground mt-1">Proposals awaiting review</p>
          </CardContent>
        </Card>

        <Card className={metrics.conflicts > 0 ? "border-amber-500/50 bg-amber-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Conflicts</CardTitle>
            <AlertCircle className={`h-4 w-4 ${metrics.conflicts > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.conflicts > 0 ? "text-amber-500" : ""}`}>{metrics.conflicts}</div>
            <p className="text-xs text-muted-foreground mt-1">Require manual merge</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Eval Harness Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-center">
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">Extraction Precision</p>
              <p className="text-3xl font-bold text-green-600">87.4%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">Extraction Recall</p>
              <p className="text-3xl font-bold text-blue-600">62.1%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-1">Retrieval NDCG@10</p>
              <p className="text-3xl font-bold text-purple-600">0.91</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
