import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
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
});
