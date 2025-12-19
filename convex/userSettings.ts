import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import bcrypt from "bcryptjs";

/**
 * Update the display name for the currently authenticated user.
 */
export const updateName = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        if (args.name.length < 2) {
            throw new Error("Name must be at least 2 characters long");
        }

        await ctx.db.patch(userId, { name: args.name });
    },
});

/**
 * Update the password for the currently authenticated user.
 */
export const updatePassword = mutation({
    args: { currentPassword: v.string(), newPassword: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // 1. Get the account record for this user (provider: "password")
        const account = await ctx.db
            .query("accounts" as any)
            .withIndex("userId" as any, (q: any) => q.eq("userId", userId))
            .filter((q: any) => q.eq(q.field("provider"), "password"))
            .first();

        if (!account) {
            throw new Error("Password account not found. Are you using a social login?");
        }

        // 2. Verify current password
        const isMatch = await bcrypt.compare(args.currentPassword, account.secret);
        if (!isMatch) {
            throw new Error("Incorrect current password");
        }

        if (args.newPassword.length < 8) {
            throw new Error("New password must be at least 8 characters long");
        }

        // 3. Hash and update new password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(args.newPassword, salt);

        await ctx.db.patch(account._id, { secret: hash });
    },
});

/**
 * Delete the currently authenticated user's account and all their content.
 */
export const deleteAccount = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        // 1. Find and delete all photos uploaded by this user
        const photos = await ctx.db
            .query("photos")
            .withIndex("by_uploader_id", (q) => q.eq("uploaderId", userId))
            .collect();

        for (const photo of photos) {
            // Delete from R2 storage
            await ctx.runMutation(api.r2.deleteObject, { key: photo.storageId });
            // Delete record
            await ctx.db.delete(photo._id);
        }

        // 2. Find and delete all posts uploaded by this user
        const posts = await ctx.db
            .query("posts")
            .withIndex("by_uploader_id", (q) => q.eq("uploaderId", userId))
            .collect();

        for (const post of posts) {
            // Delete all photos in the post from R2 storage
            for (const storageId of post.photoStorageIds) {
                await ctx.runMutation(api.r2.deleteObject, { key: storageId });
            }
            // Delete record
            await ctx.db.delete(post._id);
        }

        // 3. Delete user authentication data
        // Delete accounts linked to this user
        const accounts = await ctx.db
            .query("accounts" as any)
            .withIndex("userId" as any, (q: any) => q.eq("userId", userId))
            .collect();

        for (const account of accounts) {
            await ctx.db.delete(account._id);
        }

        // Delete sessions for this user
        const sessions = await ctx.db
            .query("sessions" as any)
            .withIndex("userId" as any, (q: any) => q.eq("userId", userId))
            .collect();

        for (const session of sessions) {
            await ctx.db.delete(session._id);
        }

        // 4. Delete the user record itself
        await ctx.db.delete(userId);
    },
});
