import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import { prisma } from "@obos/database";
import { authConfig } from "./auth.config";

function googleProviders() {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) return [];
  return [Google({ clientId, clientSecret })];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: googleProviders(),
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    ...authConfig.callbacks,
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
  events: {
    async signIn({ user }) {
      if (user.id) {
        await prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date(), authProvider: "google" },
          })
          .catch((err) => console.error("[auth] signIn event failed:", err));
      }
    },
  },
});

export function authConfigStatus() {
  return {
    hasSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    hasGoogle: Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()),
    hasDatabase: Boolean(process.env.DATABASE_URL?.trim()),
    authUrl: process.env.AUTH_URL?.trim() ?? null,
  };
}
