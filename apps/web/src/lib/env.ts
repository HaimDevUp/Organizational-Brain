/** Ensure app URLs include a protocol (Auth.js requires a valid absolute URL). */
export function normalizeAppUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  const withoutTrailingSlash = trimmed.replace(/\/+$/, "");
  if (/^https?:\/\//i.test(withoutTrailingSlash)) return withoutTrailingSlash;
  return `https://${withoutTrailingSlash}`;
}

/** Patch AUTH_URL at module load so Auth.js never receives a bare hostname. */
export function ensureAuthUrlEnv(): void {
  const normalized = normalizeAppUrl(process.env.AUTH_URL);
  if (normalized) process.env.AUTH_URL = normalized;
}

ensureAuthUrlEnv();
