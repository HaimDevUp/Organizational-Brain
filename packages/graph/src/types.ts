import type { KnowledgeRelationType } from "@obos/database";

export type GraphNode = {
  id: string;
  title: string;
  slug: string;
  gitPath: string;
  departmentId: string | null;
  departmentName?: string | null;
  ownerUserId: string;
  status: string;
  docType: string;
  tags: string[];
  healthScore: number | null;
  updatedAt: string;
  incomingCount: number;
  outgoingCount: number;
  importance: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relationType: KnowledgeRelationType;
  confidenceScore: number | null;
};

export type GraphSnapshot = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type GraphTraversalOptions = {
  depth?: number;
  maxNodes?: number;
  relationTypes?: KnowledgeRelationType[];
  departmentIds?: string[];
};

export type GraphPath = {
  documentIds: string[];
  titles: string[];
  relationTypes: KnowledgeRelationType[];
};

export type GraphHealthMetrics = {
  orphanDocuments: number;
  disconnectedClusters: number;
  brokenReferences: number;
  missingLinks: number;
  mostConnected: Array<{ documentId: string; title: string; linkCount: number }>;
  knowledgeSilos: Array<{ departmentId: string | null; departmentName: string | null; documentCount: number; externalLinks: number }>;
};

export const DEFAULT_GRAPH_DEPTH = parseInt(process.env.GRAPH_EXPANSION_DEPTH ?? "2", 10);
export const DEFAULT_GRAPH_MAX_DOCS = parseInt(process.env.GRAPH_MAX_DOCUMENTS ?? "15", 10);
export const DEFAULT_SEMANTIC_TOP_K = parseInt(process.env.GRAPH_SEMANTIC_TOP_K ?? "3", 10);
