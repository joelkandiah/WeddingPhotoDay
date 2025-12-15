import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function getIsAdmin(ctx: QueryCtx) {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
        throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
        .query("admins")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();

    return isAdmin;
}
