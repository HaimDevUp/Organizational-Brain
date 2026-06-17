"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Agent = { id: string; name: string; slug: string; description: string | null; pluginKey: string | null };

export default function AgentsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [orgId, setOrgId] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/organizations/${orgSlug}`)
      .then((r) => r.json())
      .then((org) => {
        setOrgId(org.id);
        return fetch(`/api/v1/organizations/${org.id}/agents`);
      })
      .then((r) => r.json())
      .then((d) => setAgents(d.data ?? []));
  }, [orgSlug]);

  async function run() {
    if (!selected || !message.trim()) return;
    setLoading(true);
    setResponse("");
    const res = await fetch(`/api/v1/organizations/${orgId}/agents/${selected.id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setResponse(data.answer ?? data.detail ?? "Error");
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI Agents</h1>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3">
          {agents.map((agent) => (
            <Card
              key={agent.id}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                selected?.id === agent.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setSelected(agent)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{agent.name}</CardTitle>
                {agent.pluginKey && <Badge variant="outline">{agent.pluginKey}</Badge>}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{selected ? `Run ${selected.name}` : "Select an agent"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask the agent…"
              rows={4}
              disabled={!selected}
            />
            <Button onClick={run} disabled={!selected || loading}>
              {loading ? "Running…" : "Run agent"}
            </Button>
            {response && (
              <div className="rounded-md border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                {response}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
