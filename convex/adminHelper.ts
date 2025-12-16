import { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Helper function to check if the current user is an admin
 * Works with the sitewide login system where role is stored in the users table
 */
export async function getIsAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const userId = await getAuthUserId(ctx);
  
  if (!userId) {
    return false;
  }

  // Get user from database to check role
  const user = await ctx.db.get(userId);

  return user?.role === 'admin';
}
