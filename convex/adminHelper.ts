import { QueryCtx, MutationCtx } from "./_generated/server";

// Define interface for user identity with role
interface UserIdentity {
  subject: string;
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
}

/**
 * Helper function to check if the current user is an admin
 * Works with the sitewide login system where role is stored in the auth identity
 */
export async function getIsAdmin(ctx: QueryCtx | MutationCtx): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity() as UserIdentity | null;
  
  if (!identity) {
    return false;
  }

  // Check the role from the user identity
  // The role is set during login based on which password was used
  return identity.role === 'admin';
}
