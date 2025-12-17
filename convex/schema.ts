import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { categoryValidator } from "./constants";

export default defineSchema({
  ...authTables,
  // Override users table to add role field while maintaining compatibility with @convex-dev/auth
  users: defineTable({
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    role: v.optional(v.union(v.literal('user'), v.literal('admin'))),
    // tokenIdentifier must be optional for @convex-dev/auth compatibility
    tokenIdentifier: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  photos: defineTable({
    storageId: v.string(),
    uploaderName: v.string(),
    caption: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_storage_id", ["storageId"])
    .index("by_status", ["status"])
    .index("by_uploader", ["uploaderName"]),

  posts: defineTable({
    uploaderName: v.string(),
    caption: v.optional(v.string()),
    photoStorageIds: v.array(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedAt: v.optional(v.number()),
    category: categoryValidator,
  })
    .index("by_storage_ids", ["photoStorageIds"])
    .index("by_status", ["status"])
    .index("by_uploader", ["uploaderName"])
    .index("by_category", ["category"])
    .index("by_status_and_category", ["status", "category"]),
});
