import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getIsAdmin } from "./adminHelper";
import { r2 } from "./r2";

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
    // Delegate to R2 component for generating upload URLs
    const { url } = await r2.generateUploadUrl(ctx);
    return url;
  },
});

export const uploadPhoto = mutation({
  args: {
    storageId: v.id("_storage"),
    uploaderName: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("photos", {
      storageId: args.storageId,
      uploaderName: args.uploaderName,
      caption: args.caption,
      status: "pending",
    });
  },
});

export const isUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await getIsAdmin(ctx);

    return isAdmin;
  },
});

// Admin queries and mutations
export const getPendingPhotos = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await getIsAdmin(ctx);

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
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const isAdmin = await getIsAdmin(ctx);

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.photoId, {
      status: "approved",
      approvedAt: Date.now(),
    });
  },
});

export const rejectPhoto = mutation({
  args: {
    photoId: v.id("photos"),
  },
  handler: async (ctx, args) => {
    const isAdmin = await getIsAdmin(ctx);

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.photoId, {
      status: "rejected",
    });
  },
});

// Get approved photos for admin review
export const getApprovedPhotosForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await getIsAdmin(ctx);
    
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
    const isAdmin = await getIsAdmin(ctx);

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
    const isAdmin = await getIsAdmin(ctx);

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
    const isAdmin = await getIsAdmin(ctx);

    if (!isAdmin) {
      throw new Error("Not authorized");
    }

    const pendingPhotos = await ctx.db
      .query("photos")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Approve all pending photos
    await Promise.all(
      pendingPhotos.map((photo) =>
        ctx.db.patch(photo._id, {
          status: "approved",
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
    const isAdmin = await getIsAdmin(ctx);

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
