"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    setHasError(false);

    try {
      const { error } = await createSupabaseBrowserClient().auth.signOut();
      if (error) {
        setHasError(true);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setHasError(true);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="rounded-md border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200 hover:border-neutral-500 hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:opacity-60"
      >
        {isSigningOut ? "Signing out..." : "Sign out"}
      </button>
      {hasError && (
        <span role="alert" className="absolute mt-11 text-xs text-rose-300">
          Sign out failed. Please try again.
        </span>
      )}
    </div>
  );
}