import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const projects = [
    { id: "proj_123", name: "Core Agent Engine", description: "Main repository for the autonomous agent engine." },
    { id: "proj_456", name: "Web App Frontend", description: "Next.js dashboard for agent monitoring." }
  ];

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">Select a project to view its memories and active tasks.</p>
        </div>
        <Button>New Project</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((p) => (
            <Card key={p.id} className="h-full hover:border-primary">
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-muted-foreground mb-4">
                  <span className="bg-secondary px-2 py-1 rounded-md text-xs">ID: {p.id}</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/projects/${p.id}/memory`}>
                    <Button variant="outline" size="sm">Memory</Button>
                  </Link>
                  <Link href={`/projects/${p.id}/inbox`}>
                    <Button variant="secondary" size="sm">Inbox</Button>
                  </Link>
                  <Link href={`/projects/${p.id}/health`}>
                    <Button variant="ghost" size="sm">Health</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
