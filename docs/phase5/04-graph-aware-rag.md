# Graph-Aware RAG

File: `packages/rag/src/graph-retriever.ts`

## Pipeline

```
Question
  → hybridSearch (top K semantic, default K=3)
  → expandNeighborhood (depth 2, max 15 docs)
  → rank merged context
  → LLM
```

## Ranking factors

1. Semantic similarity score
2. Graph distance from seed (closer = higher)
3. Document freshness (mergedAt)
4. Published status filter

## Chat response extensions

- `citations` — direct semantic hits
- `connectedDocuments` — graph-expanded docs
- `knowledgePaths` — edge list between retrieved nodes

## Configuration

| Env | Default |
|-----|---------|
| `GRAPH_SEMANTIC_TOP_K` | 3 |
| `GRAPH_EXPANSION_DEPTH` | 2 |
| `GRAPH_MAX_DOCUMENTS` | 15 |

Disable graph: `generateBrainAnswer({ useGraph: false })`
