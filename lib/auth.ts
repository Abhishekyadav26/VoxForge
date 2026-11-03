import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { findByEmail, findOrCreateOAuthUser, getUserById } from "@/lib/db";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * NextAuth configuration with email/password + Google OAuth.
 *
 * - Credentials: bcrypt-verified against the app's user store (lib/db.ts →
 *   Supabase users table, or local JSON files).
 * - Google: on first sign-in the email is linked to the same user store
 *   (findOrCreateOAuthUser), so a Google account and a password account with
 *   the same email are the SAME user and share agents.
 *
 * The store user id is carried in the JWT and used to scope agents/runs.
 *
 * Env vars (see .env.example):
 *   NEXTAUTH_URL, NEXTAUTH_SECRET  — base URL + openssl rand -base64 32
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — Google OAuth 2.0 credentials
 *        (console.cloud.google.com → APIs & Services → Credentials → OAuth
 *        client, type "Web application").
 *        Authorized redirect URI must be:
 *        {NEXTAUTH_URL}/api/auth/callback/google
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        // Human check first (fail fast): blocks automated
        // credential-stuffing and account-enumeration via sign-in.
        const human = await verifyTurnstile(
          (credentials as Record<string, unknown>).turnstileToken
        );
        if (!human.ok) throw new Error(human.error ?? "Human verification failed");
        const email = credentials.email.toLowerCase();
        // Basic shape check before hitting storage.
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        try {
          const user = await findByEmail(email);
          // OAuth-only accounts have no password — can't sign in with credentials.
          if (!user || !user.passwordHash) return null;
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email.split("@")[0],
            // Carried into the JWT so a later password change can revoke it.
            sessionVersion: user.sessionVersion ?? 0,
          } as any;
        } catch (e) {
          console.error("[auth] authorize error:", e);
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      // First sign-in: carry the store user id into the token.
      if (user) {
        if (account?.provider === "google") {
          // Link/create the local user for a Google account (by email).
          try {
            const local = await findOrCreateOAuthUser({
              email: user.email ?? "",
              name: user.name ?? undefined,
            });
            token.uid = local.id;
            token.sv = local.sessionVersion ?? 0;
          } catch (e) {
            console.error("[auth] google link error:", e);
            token.uid = user.id; // fall back to provider id
            token.sv = 0;
          }
        } else {
          // Credentials sign-in already returns the store id.
          token.uid = user.id;
          token.sv = (user as any).sessionVersion ?? 0;
        }
        delete token.invalid;
        return token;
      }

      // Every later request: verify the session version so a password reset
      // (which bumps it) logs out all existing sessions for that user. If the
      // store is unavailable we keep the session rather than fail closed.
      if (token.uid) {
        try {
          const current = await getUserById(token.uid as string);
          if (!current || (current.sessionVersion ?? 0) !== (token.sv ?? 0)) {
            token.invalid = true;
            token.uid = undefined;
            delete token.sv;
          }
        } catch (e) {
          console.warn("[auth] session version check failed:", (e as Error).message);
        }
      }
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