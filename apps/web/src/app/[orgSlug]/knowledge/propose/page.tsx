"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProposeKnowledgePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [proposal, setProposal] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function structure() {
    setLoading(true);
    setError(null);
    const orgRes = await fetch(`/api/v1/organizations/${orgSlug}`);
    const org = await orgRes.json();
    const res = await fetch(`/api/v1/organizations/${org.id}/brain/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText, submit: false }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.detail ?? "Failed to structure knowledge");
      return;
    }
    setProposal(data.proposal);
  }

  async function submit() {
    setLoading(true);
    setError(null);
    const orgRes = await fetch(`/api/v1/organizations/${orgSlug}`);
    const org = await orgRes.json();
    const res = await fetch(`/api/v1/organizations/${org.id}/brain/structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText, submit: true }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.detail ?? "Failed to submit proposal");
      return;
    }
    if (data.proposal) {
      setProposal(data.proposal);
    }
    if (data.pullRequest?.id) {
      router.push(`/${orgSlug}/approvals/${data.pullRequest.id}`);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">AI Knowledge Proposal</h1>
      <p className="text-muted-foreground mb-6">
        Paste raw notes — AI structures metadata and opens a pull request automatically
      </p>

      <Textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder="Paste your knowledge content, notes, or draft documentation…"
        rows={12}
        className="mb-4"
      />

      <div className="flex gap-2 mb-8">
        <Button onClick={structure} disabled={loading || rawText.length < 10}>
          Preview structure
        </Button>
        <Button onClick={submit} disabled={loading || rawText.length < 10} variant="default">
          Submit & create PR
        </Button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {proposal && (
        <Card>
          <CardHeader>
            <CardTitle>{String(proposal.title)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge>{String(proposal.docType)}</Badge>
              {(proposal.tags as string[])?.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground">{String(proposal.summary)}</p>
            <p className="font-mono text-xs">{String(proposal.gitPath)}</p>
            <pre className="rounded-md bg-muted p-4 overflow-auto text-xs max-h-64">
              {String(proposal.markdown)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
