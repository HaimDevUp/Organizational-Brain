"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const CytoscapeGraph = dynamic(() => import("./cytoscape-graph"), { ssr: false });

type GraphNode = {
  id: string;
  title: string;
  departmentId: string | null;
  status: string;
  importance: number;
  incomingCount: number;
  outgoingCount: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relationType: string;
};

type NodeDetail = {
  document: {
    id: string;
    title: string;
    gitPath: string;
    status: string;
    tags: string[];
    owner: { name: string | null; email: string };
    department: { name: string; slug: string } | null;
    currentVersion: { contentPreview: string | null; mergedAt: Date } | null;
  };
  relations: {
    outgoing: Array<{ relationType: string; targetDocument: { id: string; title: string } }>;
    incoming: Array<{ relationType: string; sourceDocument: { id: string; title: string } }>;
  };
};

export function KnowledgeGraphView({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [relationFilter, setRelationFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NodeDetail | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (departmentId) params.set("departmentId", departmentId);
      const res = await fetch(`/api/v1/organizations/${orgId}/graph?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Failed to load graph");
      let loadedNodes: GraphNode[] = data.nodes ?? [];
      let loadedEdges: GraphEdge[] = data.edges ?? [];
      if (relationFilter) {
        loadedEdges = loadedEdges.filter((e) => e.relationType === relationFilter);
        const linked = new Set(loadedEdges.flatMap((e) => [e.source, e.target]));
        loadedNodes = loadedNodes.filter((n) => linked.has(n.id));
      }
      setNodes(loadedNodes);
      setEdges(loadedEdges);
    } finally {
      setLoading(false);
    }
  }, [orgId, search, departmentId, relationFilter]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void (async () => {
      const res = await fetch(
        `/api/v1/organizations/${orgId}/graph?view=detail&documentId=${selectedId}`
      );
      const data = await res.json();
      if (res.ok) setDetail(data);
    })();
  }, [orgId, selectedId]);

  const visibleNodes = focusMode && selectedId
    ? nodes.filter(
        (n) =>
          n.id === selectedId ||
          edges.some(
            (e) =>
              (e.source === selectedId && e.target === n.id) ||
              (e.target === selectedId && e.source === n.id)
          )
      )
    : nodes;

  const visibleEdges = focusMode && selectedId
    ? edges.filter((e) => e.source === selectedId || e.target === selectedId)
    : edges;

  return (
    <div className="flex h-full min-h-0 max-h-full flex-col overflow-hidden">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <Input
          placeholder="Search documents…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Input
          placeholder="Department ID filter"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="max-w-[200px]"
        />
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={relationFilter}
          onChange={(e) => setRelationFilter(e.target.value)}
        >
          <option value="">All relations</option>
          <option value="related_to">related_to</option>
          <option value="depends_on">depends_on</option>
          <option value="contradicts">contradicts</option>
          <option value="references">references</option>
        </select>
        <Button variant="outline" size="sm" onClick={() => setFocusMode((f) => !f)}>
          {focusMode ? "Full graph" : "Focus mode"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => void loadGraph()}>
          Refresh
        </Button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted/20">
        {loading ? (
          <p className="p-8 text-sm text-muted-foreground">Loading graph…</p>
        ) : visibleNodes.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground">
            No documents in this organization yet.
          </p>
        ) : (
          <CytoscapeGraph
            nodes={visibleNodes}
            edges={visibleEdges}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}

        {detail && (
          <Card className="absolute inset-y-0 right-0 z-10 flex w-80 flex-col overflow-hidden border-l bg-background shadow-lg">
            <CardHeader className="shrink-0 space-y-2 pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{detail.document.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 px-2"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                >
                  ✕
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{detail.document.status}</Badge>
                {detail.document.department && (
                  <Badge variant="secondary">{detail.document.department.name}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto text-sm">
              <p className="text-muted-foreground">{detail.document.gitPath}</p>
              <p>Owner: {detail.document.owner.name ?? detail.document.owner.email}</p>
              <div>
                <p className="mb-1 font-medium">Outgoing</p>
                <ul className="space-y-1">
                  {detail.relations.outgoing.map((r, i) => (
                    <li key={i}>
                      <Badge variant="outline" className="mr-1 text-xs">
                        {r.relationType}
                      </Badge>
                      {r.targetDocument.title}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1 font-medium">Incoming</p>
                <ul className="space-y-1">
                  {detail.relations.incoming.map((r, i) => (
                    <li key={i}>
                      <Badge variant="outline" className="mr-1 text-xs">
                        {r.relationType}
                      </Badge>
                      {r.sourceDocument.title}
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/${orgSlug}/knowledge/${detail.document.id}`}>Open document</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
