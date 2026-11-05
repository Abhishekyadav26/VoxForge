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
        className="h-9 px-3 text-xs sm:h-7"
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
        className="inline-flex min-h-9 items-center whitespace-nowrap px-1 py-1 text-xs text-slate-400 hover:text-white sm:min-h-0"
        onClick={() => signOut({ callbackUrl: "/" })}
        title={session.user.name ?? session.user.email ?? "Signed in"}
      >
        Sign out
      </button>
    </span>
  );
}
