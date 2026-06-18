/** Edge-safe check — no Prisma imports. */
export function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === "true";
}
