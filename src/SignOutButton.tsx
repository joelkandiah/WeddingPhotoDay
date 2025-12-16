"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-2 py-1.5 md:px-4 md:py-2 rounded-sm text-xs md:text-sm bg-input-bg text-input-text border border-input-border font-semibold hover:bg-input-bg-hover transition-colors shadow-xs hover:shadow-sm sign-out-button"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
