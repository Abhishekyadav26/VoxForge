import { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

/**
 * NextAuth configuration.
 *
 * Uses JWT sessions (no database adapter): the GitHub user id is stored in
 * the token and used to scope agents/runs per user in the app's own store
 * (Supabase or local files — see lib/db.ts).
 *
 * Env vars (see .env.example):
 *   NEXTAUTH_URL     — base URL of the app (http://localhost:3000 in dev)
 *   NEXTAUTH_SECRET  — openssl rand -base64 32
 *   GITHUB_ID        — GitHub OAuth App client id
 *   GITHUB_SECRET    — GitHub OAuth App client secret
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // First sign-in: carry the provider user id into the token.
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      // Expose the stable user id (from GitHub) on the session.
      if (token.uid) session.user.id = token.uid as string;
      return session;
    },
  },
};

/** Extend the session user type so `session.user.id` type-checks. */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

/** Next.js route handler needs the types re-exported correctly. */
export type { NextAuthOptions };
