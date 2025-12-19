// convex/photos.ts
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { rateLimiter } from "./rateLimit";
import { ensureUserRole } from "./users";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata, deleteObject } =
  r2.clientApi({
    checkUpload: async (ctx, bucket) => {
      const userId = await getAuthUserId(ctx);
      if (!userId) throw new Error("Not authenticated");

      const user = await ensureUserRole(ctx as any, userId);
      if (!user) throw new Error("Not authorized");

      if ("runMutation" in ctx) {
        await rateLimiter.limit(ctx as any, "upload", { key: userId });
      }
    },
    onUpload: async (_ctx, bucket, key) => {
      console.log(`Uploaded ${bucket}/${key}`);
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
