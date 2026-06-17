export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type OrganizationSummary = {
  id: string;
  slug: string;
  name: string;
  plan: string;
  status: string;
};

export type MemberSummary = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  status: string;
  joinedAt: string | null;
};

export type DepartmentSummary = {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId: string | null;
};

export type KnowledgeDocumentSummary = {
  id: string;
  title: string;
  slug: string;
  gitPath: string;
  docType: string;
  status: string;
  departmentId: string | null;
  updatedAt: string;
};

export type PullRequestSummary = {
  id: string;
  number: number;
  title: string;
  status: string;
  sourceBranch: string;
  authorId: string;
  githubPrNumber: number | null;
  createdAt: string;
};

export type ReviewInput = {
  state: "approved" | "changes_requested" | "commented";
  body?: string;
};

export function paginate<T>(items: T[], page: number, limit: number): PaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    page,
    limit,
    total,
    totalPages,
  };
}
