"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Compact sign-in / user chip for the floating nav. */
export default function AuthButton() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") return <span className="text-xs text-slate-500">…</span>;

  if (!session?.user) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-3 text-xs"
        onClick={() => router.push("/login")}
      >
        Sign in
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      {session.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] rounded-full"
        />
      ) : (
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold">
          {(session.user.name ?? "U").slice(0, 1).toUpperCase()}
        </span>
      )}
      <button
        className="text-xs text-slate-400 hover:text-white"
        onClick={() => signOut({ callbackUrl: "/" })}
        title={session.user.name ?? session.user.email ?? "Signed in"}
      >
        Sign out
      </button>
    </span>
  );
}
