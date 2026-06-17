import { resolveEmbeddingProvider } from "@obos/ai-providers";
import { vectorSearch, type SearchFilters, type ChunkPayload } from "@obos/qdrant";

export interface RetrievedChunk {
  id: string;
  score: number;
  payload: ChunkPayload;
}

export async function semanticSearch(
  orgId: string,
  query: string,
  limit = 10,
  filters?: SearchFilters
): Promise<RetrievedChunk[]> {
  const embedder = resolveEmbeddingProvider();
  const { vectors } = await embedder.embed([query]);
  return vectorSearch(orgId, vectors[0], limit, filters);
}

export async function hybridSearch(
  orgId: string,
  query: string,
  limit = 10,
  filters?: SearchFilters
): Promise<RetrievedChunk[]> {
  const dense = await semanticSearch(orgId, query, limit * 2, filters);
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const rescored = dense.map((chunk) => {
    const text = `${chunk.payload.title} ${chunk.payload.content}`.toLowerCase();
    let keywordBoost = 0;
    for (const term of terms) {
      if (text.includes(term)) keywordBoost += 0.05;
    }
    return { ...chunk, score: (chunk.score ?? 0) + keywordBoost };
  });

  rescored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return rescored.slice(0, limit);
}

export function buildContextFromChunks(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.payload.title} (${c.payload.git_path})\n${c.payload.content}`
    )
    .join("\n\n---\n\n");
}

export function chunksToCitations(chunks: RetrievedChunk[]) {
  return chunks.map((c) => ({
    documentId: c.payload.document_id,
    title: c.payload.title,
    gitPath: c.payload.git_path,
    chunkId: c.id,
    score: c.score,
    excerpt: c.payload.content.slice(0, 280),
  }));
}

export function computeConfidence(chunks: RetrievedChunk[]): number {
  if (!chunks.length) return 0;
  const top = chunks[0]?.score ?? 0;
  const avg =
    chunks.slice(0, 3).reduce((s, c) => s + (c.score ?? 0), 0) /
    Math.min(chunks.length, 3);
  return Math.min(1, Math.max(0, (top * 0.6 + avg * 0.4)));
}
