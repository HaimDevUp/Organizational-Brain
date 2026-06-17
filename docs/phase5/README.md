# Phase 5 — Knowledge Graph Architecture

Organizational Brain OS evolves from document repository + RAG to a **connected knowledge graph** (Obsidian-inspired, enterprise-grade).

## Deliverables

| # | Document | Description |
|---|----------|-------------|
| 1 | [01-database-schema.md](./01-database-schema.md) | `knowledge_relations`, `relationship_suggestions` |
| 2 | [02-graph-service.md](./02-graph-service.md) | `@obos/graph` package API |
| 3 | [03-indexing-flow.md](./03-indexing-flow.md) | Wiki-link parsing on index |
| 4 | [04-graph-aware-rag.md](./04-graph-aware-rag.md) | Retrieval pipeline |
| 5 | [05-graph-ui.md](./05-graph-ui.md) | Cytoscape visualization |
| 6 | [06-graph-health.md](./06-graph-health.md) | Health metrics |
| 7 | [07-integrations.md](./07-integrations.md) | Agents, onboarding, experts |
| 8 | [08-performance.md](./08-performance.md) | Scale strategy |
| 9 | [09-implementation-plan.md](./09-implementation-plan.md) | Rollout steps |

## Quick start

```bash
pnpm install
pnpm db:push
pnpm db:seed          # adds graph:read, graph:manage permissions
pnpm db:reindex:graph # parse [[links]] from published docs
pnpm dev
```

Open `/{orgSlug}/graph` for the Knowledge Graph UI.

## Wiki-link syntax

```markdown
See [[Sales Process]] and [[Customer Handoff|handoff rules]].
```

On index, links resolve to document IDs and create `related_to` edges.

## Graph-aware chat (default)

```
Question → Vector (top 3) → Graph expansion (depth 2, max 15 docs) → LLM
```

Env: `GRAPH_EXPANSION_DEPTH`, `GRAPH_MAX_DOCUMENTS`, `GRAPH_SEMANTIC_TOP_K`.
