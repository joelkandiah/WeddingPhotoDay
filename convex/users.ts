import { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { Id } from "./_generated/dataModel";

export async function ensureUserRole(
    ctx: GenericMutationCtx<any> | GenericQueryCtx<any>,
    userId: Id<"users">
) {
    const user = await ctx.db.get(userId);
    if (!user) {
        return null;
    }

    // If user has no user role, attempt to auto-assign "user"
    if (!user.role) {
        // Check if we are in a Mutation context (can write)
        if ("patch" in ctx.db) {
            await ctx.db.patch(userId, { role: "user" });
            user.role = "user"; // Update local object to reflect change
        } else {
            // In Query context, we can't write, but we can assume "user" role for this session
            // to avoid blocking operations, or log a warning.
            console.warn(`User ${userId} accessed via Query without a role. Cannot auto-assign.`);
            // For read-only access, treating them as 'user' is usually safe default
            user.role = "user";
        }
    }

    return user;
}
