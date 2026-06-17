import { prisma } from "@obos/database";

/** True when auth is bypassed for local testing (never in production). */
export function isAuthDisabled(): boolean {
  if (process.env.DISABLE_AUTH !== "true") return false;
  if (process.env.NODE_ENV === "production") {
    console.warn("[obos] DISABLE_AUTH is ignored in production");
    return false;
  }
  return true;
}

export type DevSessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

let cachedDevUser: DevSessionUser | null = null;

/** Resolves or creates the dev user used when DISABLE_AUTH=true. */
export async function getDevAuthUser(): Promise<DevSessionUser> {
  if (cachedDevUser) return cachedDevUser;

  const email = process.env.DEV_AUTH_USER_EMAIL ?? "dev@obos.local";
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: "Dev User (no auth)",
        emailVerified: new Date(),
      },
    });
  }

  cachedDevUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
  };
  return cachedDevUser;
}
