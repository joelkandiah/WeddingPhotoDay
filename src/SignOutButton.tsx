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
      className="px-2 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm bg-input-bg text-input-text font-semibold hover:bg-input-bg-hover transition-colors shadow-xs hover:shadow-sm sign-out-button border-0"
      style={{border: '1px solid rgba(59, 130, 246, 0.15)'}}
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
