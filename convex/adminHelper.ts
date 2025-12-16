import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Helper function to check if the current user is an admin
 * Works with the sitewide login system where role is stored in the users table
 */
export async function getIsAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    return false;
  }

  // Get user from database to check role
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .first();

  return user?.role === 'admin';
}
