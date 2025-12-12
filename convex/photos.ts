import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Public queries
export const getApprovedPhotos = query({
  args: {},
  handler: async (ctx) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .collect();

    return Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const uploadPhoto = mutation({
  args: {
    storageId: v.id("_storage"),
    uploaderName: v.string(),
    uploaderEmail: v.optional(v.string()),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("photos", {
      storageId: args.storageId,
      uploaderName: args.uploaderName,
      uploaderEmail: args.uploaderEmail,
      caption: args.caption,
      status: "pending",
    });
  },
});

// Admin queries and mutations
export const getPendingPhotos = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    return Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );
  },
});

export const approvePhoto = mutation({
  args: {
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.photoId, {
      status: "approved",
      approvedBy: userId,
      approvedAt: Date.now(),
    });
  },
});

export const rejectPhoto = mutation({
  args: {
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.photoId, {
      status: "rejected",
    });
  },
});

export const isUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return !!admin;
  },
});

export const makeUserAdmin = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if already admin
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existingAdmin) {
      throw new Error("User is already an admin");
    }

    await ctx.db.insert("admins", {
      userId: user._id,
      email: args.email,
    });
  },
});

// Helper function to make current user admin (for setup)
export const makeMeAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User email not found");
    }

    // Check if already admin
    const existingAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingAdmin) {
      return "Already an admin";
    }

    await ctx.db.insert("admins", {
      userId: userId,
      email: user.email,
    });

    return "Admin access granted";
  },
});

// Get approved photos for admin review
export const getApprovedPhotosForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .order("desc")
      .collect();

    return Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );
  },
});

// Revoke approval for a photo
export const revokeApproval = mutation({
  args: {
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.photoId, {
      status: "pending",
    });
  },
});

// Get rejected photos for admin review
export const getRejectedPhotosForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "rejected"))
      .order("desc")
      .collect();

    return Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      }))
    );
  },
});

// Approve all pending photos
export const approveAllPending = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    const pendingPhotos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Approve all pending photos
    await Promise.all(
      pendingPhotos.map((photo) =>
        ctx.db.patch(photo._id, {
          status: "approved",
          approvedBy: userId,
          approvedAt: Date.now(),
        })
      )
    );

    return pendingPhotos.length;
  },
});

// Permanently delete a photo and its file from storage
export const deletePhoto = mutation({
  args: {
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    // Get the photo to access its storageId
    const photo = await ctx.db.get(args.photoId);
    if (!photo) {
      throw new Error("Photo not found");
    }

    // Delete the file from storage
    await ctx.storage.delete(photo.storageId);

    // Delete the database record
    await ctx.db.delete(args.photoId);
  },
});
