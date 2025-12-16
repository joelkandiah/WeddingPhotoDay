import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server"; // Added pagination validator
import { getIsAdmin } from "./adminHelper";
import { categoryValidator } from "./constants";

// Public queries
export const getApprovedPosts = query({
    args: {
        category: v.optional(categoryValidator),
    },
    handler: async (ctx, args) => {
        let posts;

        if (args.category) {
            const category = args.category;
            // Filter by specific category
            posts = await ctx.db
                .query("posts")
                .withIndex("by_status_and_category", (q) =>
                    q.eq("status", "approved").eq("category", category)
                )
                .order("desc")
                .collect();
        } else {
            // Get all approved posts
            posts = await ctx.db
                .query("posts")
                .withIndex("by_status", (q) => q.eq("status", "approved"))
                .order("desc")
                .collect();
        }

        return Promise.all(
            posts.map(async (post) => {
                const urls = await Promise.all(
                    post.photoStorageIds.map((id) => ctx.storage.getUrl(id))
                );
                return {
                    ...post,
                    photoUrls: urls.filter((url): url is string => url !== null),
                };
            })
        );
    },
});

export const getApprovedPostsPaginated = query({
    args: {
        paginationOpts: paginationOptsValidator,
        category: v.optional(categoryValidator),
    },
    handler: async (ctx, args) => {
        // Pagination handler
        let result;

        if (args.category) {
            // Filter by specific category
            const category = args.category;
            result = await ctx.db
                .query("posts")
                .withIndex("by_status_and_category", (q) =>
                    q.eq("status", "approved").eq("category", category)
                )
                .order("desc")
                .paginate(args.paginationOpts);
        } else {
            // Get all approved posts
            result = await ctx.db
                .query("posts")
                .withIndex("by_status", (q) => q.eq("status", "approved"))
                .order("desc")
                .paginate(args.paginationOpts);
        }

        const page = await Promise.all(
            result.page.map(async (post) => {
                const urls = await Promise.all(
                    post.photoStorageIds.map((id) => ctx.storage.getUrl(id))
                );
                return {
                    ...post,
                    photoUrls: urls.filter((url): url is string => url !== null),
                };
            })
        );

        return { ...result, page };
    },
});

export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const uploadPost = mutation({
    args: {
        photoStorageIds: v.array(v.id("_storage")),
        uploaderName: v.string(),
        uploaderEmail: v.optional(v.string()),
        caption: v.optional(v.string()),
        category: categoryValidator,
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("posts", {
            photoStorageIds: args.photoStorageIds,
            uploaderName: args.uploaderName,
            caption: args.caption,
            status: "pending",
            category: args.category,
        });
    },
});

// Admin queries and mutations
export const getPendingPosts = query({
    args: {},
    handler: async (ctx) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        const posts = await ctx.db
            .query("posts")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .order("desc")
            .collect();

        return Promise.all(
            posts.map(async (post) => {
                const urls = await Promise.all(
                    post.photoStorageIds.map((id) => ctx.storage.getUrl(id))
                );
                return {
                    ...post,
                    photoUrls: urls.filter((url): url is string => url !== null),
                };
            })
        );
    },
});

export const getApprovedPostsForAdmin = query({
    args: {},
    handler: async (ctx) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        const posts = await ctx.db
            .query("posts")
            .withIndex("by_status", (q) => q.eq("status", "approved"))
            .order("desc")
            .collect();

        return Promise.all(
            posts.map(async (post) => {
                const urls = await Promise.all(
                    post.photoStorageIds.map((id) => ctx.storage.getUrl(id))
                );
                return {
                    ...post,
                    photoUrls: urls.filter((url): url is string => url !== null),
                };
            })
        );
    },
});

export const getRejectedPostsForAdmin = query({
    args: {},
    handler: async (ctx) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        const posts = await ctx.db
            .query("posts")
            .withIndex("by_status", (q) => q.eq("status", "rejected"))
            .order("desc")
            .collect();

        return Promise.all(
            posts.map(async (post) => {
                const urls = await Promise.all(
                    post.photoStorageIds.map((id) => ctx.storage.getUrl(id))
                );
                return {
                    ...post,
                    photoUrls: urls.filter((url): url is string => url !== null),
                };
            })
        );
    },
});

export const approvePost = mutation({
    args: {
        postId: v.id("posts"),
    },
    handler: async (ctx, args) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        await ctx.db.patch(args.postId, {
            status: "approved",
            approvedAt: Date.now(),
        });
    },
});

export const rejectPost = mutation({
    args: {
        postId: v.id("posts"),
    },
    handler: async (ctx, args) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        await ctx.db.patch(args.postId, {
            status: "rejected",
        });
    },
});

export const revokePostApproval = mutation({
    args: {
        postId: v.id("posts"),
    },
    handler: async (ctx, args) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        await ctx.db.patch(args.postId, {
            status: "pending",
        });
    },
});

export const approveAllPendingPosts = mutation({
    args: {},
    handler: async (ctx) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const pendingPosts = await ctx.db
            .query("posts")
            .withIndex("by_status", (q) => q.eq("status", "pending"))
            .collect();

        await Promise.all(
            pendingPosts.map((post) =>
                ctx.db.patch(post._id, {
                    status: "approved",
                    approvedAt: Date.now(),
                })
            )
        );

        return pendingPosts.length;
    },
});

export const deletePost = mutation({
    args: {
        postId: v.id("posts"),
    },
    handler: async (ctx, args) => {
        const isAdmin = await getIsAdmin(ctx);

        if (!isAdmin) {
            throw new Error("Not authorized");
        }

        const post = await ctx.db.get(args.postId);
        if (!post) {
            throw new Error("Post not found");
        }

        // Delete all photos from storage
        await Promise.all(
            post.photoStorageIds.map((storageId) => ctx.storage.delete(storageId))
        );

        // Delete the post record
        await ctx.db.delete(args.postId);
    },
});
