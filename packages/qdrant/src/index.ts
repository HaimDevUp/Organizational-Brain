import { QdrantClient } from "@qdrant/js-client-rest";
import { AppError } from "@obos/shared";
import { installQdrantFetchCompat } from "./fetch-compat";

export const VECTOR_SIZE = parseInt(process.env.QDRANT_VECTOR_SIZE ?? "1536", 10);

let client: QdrantClient | null = null;

function resolveQdrantClientOptions(): ConstructorParameters<typeof QdrantClient>[0] {
  const url = process.env.QDRANT_URL ?? "http://localhost:6333";
  const apiKey = process.env.QDRANT_API_KEY?.trim();
  const checkCompatibility =
    process.env.QDRANT_CHECK_COMPATIBILITY === "true";

  return {
    url,
    ...(apiKey ? { apiKey } : {}),
    checkCompatibility,
  };
}

export function getQdrantClient(): QdrantClient {
  if (!client) {
    installQdrantFetchCompat();
    client = new QdrantClient(resolveQdrantClientOptions());
  }
  return client;
}

async function qdrantCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error) {
      const cause = (err as Error & { cause?: { code?: string } }).cause;
      if (err.message.includes("ECONNREFUSED") || cause?.code === "ECONNREFUSED") {
        throw new AppError(
          503,
          "Search Unavailable",
          "Qdrant is not reachable at QDRANT_URL. Start it with: docker compose up -d qdrant",
          "service-unavailable"
        );
      }
    }
    throw err;
  }
}

export function collectionName(orgId: string): string {
  return `org_${orgId.replace(/-/g, "")}_knowledge`;
}

export interface ChunkPayload {
  organization_id: string;
  document_id: string;
  version_id: string;
  department_id: string | null;
  git_path: string;
  title: string;
  chunk_index: number;
  heading_path: string[];
  content: string;
  tags: string[];
  doc_type: string;
  status: string;
}

export async function ensureCollection(orgId: string): Promise<string> {
  const qdrant = getQdrantClient();
  const name = collectionName(orgId);
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some((c) => c.name === name);
  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    await qdrant.createPayloadIndex(name, {
      field_name: "organization_id",
      field_schema: "keyword",
    });
    await qdrant.createPayloadIndex(name, {
      field_name: "document_id",
      field_schema: "keyword",
    });
    await qdrant.createPayloadIndex(name, {
      field_name: "department_id",
      field_schema: "keyword",
    });
    await qdrant.createPayloadIndex(name, {
      field_name: "tags",
      field_schema: "keyword",
    });
  }
  return name;
}

export async function upsertChunks(
  orgId: string,
  points: Array<{ id: string; vector: number[]; payload: ChunkPayload }>
) {
  if (!points.length) return;
  const name = await ensureCollection(orgId);
  const qdrant = getQdrantClient();
  await qdrant.upsert(name, {
    wait: true,
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload as unknown as Record<string, unknown>,
    })),
  });
}

export async function deleteDocumentChunks(orgId: string, documentId: string) {
  const name = collectionName(orgId);
  const qdrant = getQdrantClient();
  try {
    await qdrant.delete(name, {
      wait: true,
      filter: {
        must: [{ key: "document_id", match: { value: documentId } }],
      },
    });
  } catch {
    // collection may not exist yet
  }
}

export async function deleteVersionChunks(orgId: string, documentId: string, versionId: string) {
  const name = collectionName(orgId);
  const qdrant = getQdrantClient();
  try {
    await qdrant.delete(name, {
      wait: true,
      filter: {
        must: [
          { key: "document_id", match: { value: documentId } },
          { key: "version_id", match: { value: versionId } },
        ],
      },
    });
  } catch {
    // ignore
  }
}

export interface SearchFilters {
  departmentIds?: string[];
  /** Include chunks with null department_id (org-wide knowledge). */
  includeDepartmentNull?: boolean;
  tags?: string[];
  documentIds?: string[];
}

export async function vectorSearch(
  orgId: string,
  vector: number[],
  limit: number,
  filters?: SearchFilters
) {
  const name = await ensureCollection(orgId);
  const qdrant = getQdrantClient();
  const must: object[] = [
    { key: "organization_id", match: { value: orgId } },
    { key: "status", match: { value: "published" } },
  ];
  if (filters?.departmentIds?.length && filters.includeDepartmentNull) {
    must.push({
      should: [
        { key: "department_id", match: { any: filters.departmentIds } },
        { is_null: { key: "department_id" } },
      ],
    });
  } else if (filters?.departmentIds?.length) {
    must.push({ key: "department_id", match: { any: filters.departmentIds } });
  } else if (filters?.includeDepartmentNull) {
    must.push({ is_null: { key: "department_id" } });
  }
  if (filters?.tags?.length) {
    must.push({ key: "tags", match: { any: filters.tags } });
  }
  if (filters?.documentIds?.length) {
    must.push({ key: "document_id", match: { any: filters.documentIds } });
  }

  const result = await qdrantCall(() =>
    qdrant.search(name, {
      vector,
      limit,
      with_payload: true,
      score_threshold: parseFloat(process.env.QDRANT_SCORE_THRESHOLD ?? "0.55"),
      filter: { must },
    })
  );

  return result.map((r) => ({
    id: String(r.id),
    score: r.score,
    payload: r.payload as unknown as ChunkPayload,
  }));
}
