# Performance Strategy

## Current (Phase 5)

- **Storage:** Postgres adjacency list (`knowledge_relations`) — no graph DB required
- **Traversal:** In-memory adjacency from single query per expansion
- **Limits:** `GRAPH_MAX_DOCUMENTS=15` prevents context explosion in RAG
- **UI:** Full snapshot for org subgraph; Cytoscape `cose` layout

## Target scale

| Scale | Approach |
|-------|----------|
| 10k docs | Department-filtered subgraph API; index-only importance precompute |
| 100k edges | Materialized `document_link_counts`; pagination on `listOrgRelations` |
| 1000+ users | Read replicas; cache graph snapshots in Redis (org + dept key) |

## Lazy loading (UI roadmap)

1. Load seed nodes + 1-hop on focus
2. Virtualize off-screen Cytoscape elements
3. Server-side clustering by department/community

## Optional Phase 6

- Neo4j or Apache AGE for complex path queries
- Background graph analytics worker (PageRank, betweenness)
