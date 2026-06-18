import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import "./env";

function googleProviders() {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) return [];
  return [Google({ clientId, clientSecret })];
}

/**
 * Edge-safe Auth.js config (no Prisma). Used by middleware only.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  providers: googleProviders(),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
