import { describe, it, expect } from "vitest";
import { resolveKnowledgeSearchFilters, type KnowledgeAccessScope } from "./access-scope";
import { ForbiddenError } from "@obos/shared";

describe("resolveKnowledgeSearchFilters", () => {
  it("returns no department filter for org-wide scope", () => {
    const scope: KnowledgeAccessScope = { orgWide: true, departmentIds: [] };
    expect(resolveKnowledgeSearchFilters(scope)).toEqual({});
  });

  it("filters to requested department for org-wide users", () => {
    const scope: KnowledgeAccessScope = { orgWide: true, departmentIds: [] };
    expect(resolveKnowledgeSearchFilters(scope, "dept-1")).toEqual({
      departmentIds: ["dept-1"],
    });
  });

  it("includes org-wide chunks for scoped users", () => {
    const scope: KnowledgeAccessScope = { orgWide: false, departmentIds: ["dept-a", "dept-b"] };
    expect(resolveKnowledgeSearchFilters(scope)).toEqual({
      departmentIds: ["dept-a", "dept-b"],
      includeDepartmentNull: true,
    });
  });

  it("denies department outside scope", () => {
    const scope: KnowledgeAccessScope = { orgWide: false, departmentIds: ["dept-a"] };
    expect(() => resolveKnowledgeSearchFilters(scope, "dept-x")).toThrow(ForbiddenError);
  });
});
