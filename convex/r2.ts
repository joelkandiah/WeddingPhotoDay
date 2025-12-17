import { components } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
import { mutation } from "./_generated/server";

// R2 component client
export const r2 = new R2(components.r2);

// Server callback for onSyncMetadata
// This is called when R2 syncs metadata about uploaded files
export const onSyncMetadata = r2.onSyncMetadata(async (ctx, metadata) => {
  // Log metadata sync for debugging
  console.log("R2 metadata synced:", metadata);
  // You can add custom logic here to track uploads in your database
  // For example, update a tracking table or send notifications
});

// Export generateUploadUrl mutation to be used by posts and photos
// This maintains compatibility with the existing upload flow
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Generate upload URL using the R2 component
    // This returns an upload URL and storage key compatible with the current flow
    const { url, storageKey } = await r2.generateUploadUrl(ctx);
    
    // Return just the URL to match the existing interface
    // The storageKey is embedded in the response from the fetch
    return url;
  },
});
