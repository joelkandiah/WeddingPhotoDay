import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Helper function to check if the current user is an admin
 * Works with the sitewide login system where role is stored in the auth identity
 */
export async function getIsAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    return false;
  }

  // Check the role from the user identity
  // The role is set during login based on which password was used
  return (identity as any).role === 'admin';
}
