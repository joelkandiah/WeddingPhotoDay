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
      className="px-2 py-1.5 md:px-4 md:py-2 rounded-sm text-xs md:text-sm bg-white text-secondary border border-gray-200 font-semibold hover:bg-gray-50 hover:text-secondary-hover transition-colors shadow-xs hover:shadow-sm dark:bg-black/90 dark:border-rose-800 dark:shadow-xs dark:bg-linear-to-br dark:from-bg-color-start dark:to-bg-color-end dark:hover:bg-black/90 dark:hover:border-rose-800 dark:hover:shadow-xs dark:hover:bg-linear-to-br dark:hover:from-bg-color-start dark:hover:to-bg-color-end dark:hover:text-white dark:hover:border-white"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
