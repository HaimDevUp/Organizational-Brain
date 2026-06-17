# Knowledge Graph UI

## Navigation

Sidebar → **Knowledge Graph** → `/{orgSlug}/graph`

## Stack

- **Cytoscape.js** — large-graph rendering (pan, zoom, drag)
- Dynamic import (no SSR)
- Node size ∝ `importance` (in/out links + health)

## Features

- Search by document name
- Department ID filter
- Relation type filter
- Focus mode (1-hop neighborhood)
- Node detail panel: owner, department, in/out links, link to knowledge page

## RBAC

- `graph:read` — view graph
- `graph:manage` — create links, approve/reject suggestions

## Files

- `apps/web/src/app/[orgSlug]/graph/page.tsx`
- `apps/web/src/components/brain/knowledge-graph.tsx`
- `apps/web/src/components/brain/cytoscape-graph.tsx`

## Future (lazy load)

For 10k+ nodes: paginated subgraph API, cluster by department, viewport-based element loading.
