import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const myAuthTables = {
  _auth: defineTable({
    tokenIdentifier: v.string(), // Convex's built-in auth token
    role: v.optional(v.union(v.literal('user'), v.literal('admin'))),
    createdAt: v.optional(v.number()),
    lastLogin: v.optional(v.number()),
    sessionExpiresAt: v.optional(v.number()),
  }).index('tokenIdentifier', ['tokenIdentifier']),
}

const applicationTables = {
  photos: defineTable({
    storageId: v.id("_storage"),
    uploaderName: v.string(),
    caption: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_uploader", ["uploaderName"]),

  posts: defineTable({
    uploaderName: v.string(),
    caption: v.optional(v.string()),
    photoStorageIds: v.array(v.id("_storage")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_uploader", ["uploaderName"]),

  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  })
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...myAuthTables,
  ...applicationTables,
});
