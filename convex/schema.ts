import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  photos: defineTable({
    storageId: v.id("_storage"),
    uploaderName: v.string(),
    uploaderEmail: v.optional(v.string()),
    caption: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_uploader", ["uploaderEmail"]),

  posts: defineTable({
    uploaderName: v.string(),
    uploaderEmail: v.optional(v.string()),
    caption: v.optional(v.string()),
    photoStorageIds: v.array(v.id("_storage")),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_uploader", ["uploaderEmail"]),

  admins: defineTable({
    userId: v.id("users"),
    email: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
