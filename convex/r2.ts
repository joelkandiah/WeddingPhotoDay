// Note: The 'components' export will be generated when you run 'npx convex dev'
// or 'npx convex deploy' after the convex.config.ts is processed.
// If you see a TypeScript error here, run 'npx convex dev' to generate the types.
import { components } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rateLimiter } from "./rateLimit";

// R2 component client
export const r2 = new R2(components.r2);

// Export the client API functions that the frontend will use
// The client calls generateUploadUrl() which returns { url, key }
// - url: presigned URL for direct upload to R2
// - key: the R2 object key (storage identifier) for the uploaded file
export const { generateUploadUrl, syncMetadata, deleteObject } = r2.clientApi({
  // Check if user is allowed to upload
  checkUpload: async (ctx, bucket) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user || !user.role) {
      throw new Error("Not authorized: Role required to upload");
    }

    // Rate limit: 150 uploads per hour
    // Only apply rate limiting if we're in an action/mutation context (e.g. generateUploadUrl)
    // Queries like syncMetadata don't support mutations and shouldn't be rate limited here.
    if ("runMutation" in ctx) {
      await rateLimiter.limit(ctx as any, "upload", { key: userId });
    }

    console.log(`Upload check passed for user ${userId} in bucket ${bucket}`);
  },
  // Handle successful upload
  onUpload: async (ctx, bucket, key) => {
    console.log(`File uploaded to bucket ${bucket} with key: ${key}`);
  },
});

// Write a function that constructs the URL from the storageId
// Note: Uses quality=60 for thumbnails/previews (lower than worker's default of 85 for full images)
export function getPhotoUrl(storageId: string) {
  const baseEndpoint = process.env.R2_PUBLIC_ENDPOINT;
  if (!baseEndpoint) {
    throw new Error(
      "R2_PUBLIC_ENDPOINT environment variable is not set. " +
      "Configure it in the Convex deployment environment to generate photo URLs."
    );
  }
  const normalizedBase = baseEndpoint.replace(/\/+$/, "");
  return `${normalizedBase}/images/compressed/${storageId}?quality=60`;
}
