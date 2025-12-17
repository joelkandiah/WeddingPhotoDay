// Note: The 'components' export will be generated when you run 'npx convex dev'
// or 'npx convex deploy' after the convex.config.ts is processed.
// If you see a TypeScript error here, run 'npx convex dev' to generate the types.
import { components } from "./_generated/api";
import { R2 } from "@convex-dev/r2";

// R2 component client
export const r2 = new R2(components.r2);

// Export the client API functions that the frontend will use
// The client calls generateUploadUrl() which returns { url, key }
// - url: presigned URL for direct upload to R2
// - key: the R2 object key (storage identifier) for the uploaded file
export const { generateUploadUrl, syncMetadata, deleteObject } = r2.clientApi({
  // Optional: Check if user is allowed to upload
  checkUpload: async (ctx, bucket) => {
    // Allow all uploads for now
    // You can add authentication/authorization here if needed
    console.log(`Upload check for bucket: ${bucket}`);
  },
  // Optional: Handle successful upload
  onUpload: async (ctx, bucket, key) => {
    // Log when a file is uploaded
    console.log(`File uploaded to bucket ${bucket} with key: ${key}`);
    // You can add custom logic here, like updating a database record
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
