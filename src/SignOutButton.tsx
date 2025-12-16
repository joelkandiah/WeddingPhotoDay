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
      className="px-2 py-1.5 md:px-4 md:py-2 rounded-sm text-xs md:text-sm bg-white text-gray-700 border border-gray-200 font-semibold hover:bg-gray-50 transition-colors shadow-xs hover:shadow-sm dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
