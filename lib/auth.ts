import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findByEmail } from "@/lib/db";

/**
 * NextAuth configuration with email/password (Credentials) provider.
 *
 * Secrets are verified against the app's own user store (lib/db.ts →
 * Supabase users table, or local JSON files). The user id from the store
 * is carried in the JWT and used to scope agents/runs per user.
 *
 * Env vars (see .env.example):
 *   NEXTAUTH_URL     — base URL of the app (http://localhost:3000 in dev)
 *   NEXTAUTH_SECRET  — openssl rand -base64 32
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase();
        // Basic shape check before hitting storage.
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        try {
          const user = await findByEmail(email);
          if (!user) return null;
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email.split("@")[0],
          };
        } catch (e) {
          console.error("[auth] authorize error:", e);
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // First sign-in: carry the store user id into the token.
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      // Expose the stable user id on the session.
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