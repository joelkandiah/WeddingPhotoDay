import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

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
    category: v.union(
      v.literal("US Ceremony"),
      v.literal("Reception"),
      v.literal("Getting Ready"),
      v.literal("The Journey Here"),
      v.literal("The Journey Home"),
      v.literal("UK Celebration"),
      v.literal("Legal Ceremony"),
      v.literal("Engagement")
    ),
  })
    .index("by_status", ["status"])
    .index("by_uploader", ["uploaderName"])
    .index("by_category", ["category"])
    .index("by_status_and_category", ["status", "category"]),
});
