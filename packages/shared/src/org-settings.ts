export type OrgGitSettings = {
  githubOwner?: string;
  githubRepo?: string;
  defaultBranch?: string;
  requiredApprovals?: number;
  mergeStrategy?: "merge" | "squash";
};

export type PlanLimits = {
  maxMembers?: number;
  maxDocuments?: number;
  aiRequestsPerDay?: number;
  maxAgents?: number;
};

export type OrganizationSettings = {
  git?: OrgGitSettings;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    appName?: string;
  };
  features?: {
    semanticSearch?: boolean;
    agents?: boolean;
    whiteLabel?: boolean;
  };
  /** Usage limits by plan tier (enforced in app layer; billing not integrated). */
  limits?: PlanLimits;
  /** Future: stripeCustomerId, subscriptionStatus — stored when billing ships. */
  billing?: {
    stripeCustomerId?: string;
    subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled";
  };
};

const DEFAULT_SETTINGS: OrganizationSettings = {
  git: {
    defaultBranch: "main",
    requiredApprovals: 1,
    mergeStrategy: "merge",
  },
  features: {
    semanticSearch: false,
  },
};

export function parseOrgSettings(raw: unknown): OrganizationSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  const input = raw as Record<string, unknown>;
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    git: {
      ...DEFAULT_SETTINGS.git,
      ...(typeof input.git === "object" && input.git ? (input.git as OrgGitSettings) : {}),
    },
    features: {
      ...DEFAULT_SETTINGS.features,
      ...(typeof input.features === "object" && input.features
        ? (input.features as OrganizationSettings["features"])
        : {}),
    },
  };
}

export function getRequiredApprovals(settings: OrganizationSettings): number {
  return settings.git?.requiredApprovals ?? 1;
}

export function getGitHubConfig(settings: OrganizationSettings): OrgGitSettings | null {
  const { githubOwner, githubRepo } = settings.git ?? {};
  if (!githubOwner || !githubRepo) return null;
  return settings.git!;
}
