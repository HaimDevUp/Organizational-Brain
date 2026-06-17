"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Path = {
  id: string;
  title: string;
  description: string | null;
  percentComplete: number;
  steps: { id: string; title: string; orderIndex: number; document: { id: string; title: string } | null }[];
};

export default function OnboardingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [orgId, setOrgId] = useState("");
  const [paths, setPaths] = useState<Path[]>([]);

  useEffect(() => {
    fetch(`/api/v1/organizations/${orgSlug}`)
      .then((r) => r.json())
      .then((org) => {
        setOrgId(org.id);
        return fetch(`/api/v1/organizations/${org.id}/onboarding`);
      })
      .then((r) => r.json())
      .then((d) => setPaths(d.data ?? []));
  }, [orgSlug]);

  async function completeStep(pathId: string) {
    await fetch(`/api/v1/organizations/${orgId}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathId }),
    });
    const res = await fetch(`/api/v1/organizations/${orgId}/onboarding`);
    const d = await res.json();
    setPaths(d.data ?? []);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Onboarding</h1>
      <p className="text-muted-foreground mb-6">Learning paths from approved knowledge</p>

      {paths.map((path) => (
        <Card key={path.id} className="mb-6">
          <CardHeader>
            <CardTitle>{path.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{path.description}</p>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${path.percentComplete}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{path.percentComplete}% complete</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {path.steps.map((step) => (
              <div key={step.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">{step.title}</p>
                  {step.document && (
                    <Link
                      href={`/${orgSlug}/knowledge/${step.document.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Read document
                    </Link>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => completeStep(path.id)}>
                  Mark done
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
