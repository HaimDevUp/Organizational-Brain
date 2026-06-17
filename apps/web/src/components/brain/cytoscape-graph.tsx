"use client";

import { useEffect, useMemo, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";

type Props = {
  nodes: Array<{
    id: string;
    title: string;
    importance: number;
    incomingCount: number;
    outgoingCount: number;
  }>;
  edges: Array<{ id: string; source: string; target: string; relationType: string }>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

/** One undirected line per node pair (bidirectional). */
function dedupeUndirectedEdges(
  edges: Props["edges"]
): Array<{ id: string; source: string; target: string; relationType: string }> {
  const seen = new Set<string>();
  const result: Array<{ id: string; source: string; target: string; relationType: string }> = [];
  for (const e of edges) {
    const key = [e.source, e.target].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(e);
  }
  return result;
}

/** Node diameter scales gently with connection count. */
function nodeSize(incomingCount: number, outgoingCount: number) {
  const connections = incomingCount + outgoingCount;
  return 10 + Math.min(connections, 16) * 1;
}

function labelFontSize(nodeDiameter: number) {
  return Math.max(4, Math.min(5, Math.round(nodeDiameter * 0.3)));
}

function shortTitle(title: string, maxLen = 28) {
  const trimmed = title.replace(/\s+/g, " ").trim();
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen - 1)}…` : trimmed;
}

export default function CytoscapeGraph({ nodes, edges, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const uniqueEdges = useMemo(() => dedupeUndirectedEdges(edges), [edges]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements: [
        ...nodes.map((n) => {
          const size = nodeSize(n.incomingCount, n.outgoingCount);
          return {
            data: {
              id: n.id,
              title: shortTitle(n.title),
              importance: n.importance,
              size,
              fontSize: labelFontSize(size),
              labelWidth: Math.max(44, size * 2.8),
            },
          };
        }),
        ...uniqueEdges.map((e) => ({
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            relationType: e.relationType,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#3b82f6",
            width: "data(size)",
            height: "data(size)",
            label: "data(title)",
            "text-valign": "bottom",
            "text-halign": "center",
            "text-margin-y": 1,
            "font-size": "data(fontSize)",
            color: "#64748b",
            "text-wrap": "ellipsis",
            "text-max-width": "data(labelWidth)",
            "z-index-compare": "manual",
            "z-index": 1,
          },
        },
        {
          selector: "edge",
          style: {
            width: 1,
            "line-color": "#cbd5e1",
            "curve-style": "straight",
            "z-index-compare": "manual",
            "z-index": 0,
          },
        },
        {
          selector: "node:selected",
          style: {
            "background-color": "#1d4ed8",
            "border-width": 2,
            "border-color": "#fbbf24",
            color: "#334155",
            "font-weight": 500,
          },
        },
        {
          selector: "edge[relationType = 'contradicts']",
          style: { "line-color": "#ef4444" },
        },
      ],
      layout: { name: "cose", animate: false, padding: 48 },
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.2,
    });

    cy.on("tap", "node", (evt) => {
      evt.originalEvent?.preventDefault();
      onSelect(evt.target.id());
    });
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelect(null);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [nodes, uniqueEdges, onSelect]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    if (selectedId) {
      const node = cy.getElementById(selectedId);
      if (node.nonempty()) node.select();
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-h-0 overflow-hidden overscroll-none touch-none"
    />
  );
}
