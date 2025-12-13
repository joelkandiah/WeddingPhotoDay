# Infrastructure & Feature Roadmap

This document outlines the plan to migrate storage to Cloudflare R2, implement image optimization workers, harden security, and enhance the slideshow and UI.

## 1. Cloudflare R2 & Image Processing Migration

**Goal**: Move from Convex Storage to Cloudflare R2 for cost-effective storage and leverage Cloudflare Workers for on-the-fly image compression and format conversion (HEIC to JPEG).

### Architecture
1.  **Storage**: Cloudflare R2 Bucket (`wedding-photos`).
2.  **Integration**: Use **Convex R2 Component** (or S3-compatible standard integration if a specific plugin is unavailable, but optimize for R2 specifics).
3.  **Compute**: Cloudflare Worker (`image-worker`) acting as the delivery gateway.
4.  **Database**: Convex stores the `r2_object_key` and a separate `processing_status` field used to notify the user.

### Implementation Steps

#### A. Backend (Convex)
-   **R2 Integration**: Use the standard pattern for R2 (likely S3 client config) or specific component if applicable.
-   **Concurrency**:
    -   Use `ctx.scheduler` to offload heavy post-processing if needed.
    -   Ensure database transactions are short to avoid contention.
    -   Use `optimistic updates` on the client for immediate feedback.
-   Update `uploadPost` mutation:
    -   Accept `r2Key`.
    -   Set `processingStatus: "processing"`.

#### B. Frontend (Upload)
-   Update `PhotoUpload.tsx`:
    1.  Call action to get R2 Signed URL.
    2.  Upload file to R2.
    3.  Call `uploadPost`.
    4.  **UI Feedback**: Show "Processing..." badge on the new post until the worker confirms completion (via webhook or polling).

#### C. Cloudflare Worker (Delivery & Compression)
-   Set up a Worker route (e.g., `images.yourdomain.com/*`).
-   **Logic**:
    1.  Parse the requested key.
    2.  Fetch object from R2.
    3.  **Content Negotiation/Transformation**:
        -   **Primary Strategy**: Use **Cloudflare Image Resizing** (Pro Plan).
            -   *Why?*: It is the robust, "no-code" solution for resizing, format optimization (WebP/AVIF), and HEIC conversion.
            -   *Cost*: Included in Pro ($20/mo) + usage. Worth it for stability.
        -   **Alternative (Free)**: `@cloudflare/photon` (WASM).
            -   *Note on JIMP*: **Avoid JIMP**. It is pure JavaScript and too slow/memory-intensive for high-performance Workers.
        -   Resize if query params provided (e.g., `?w=800`).
    4.  Return optimized image with aggressive `Cache-Control` headers (e.g., `public, max-age=31536000, immutable`).

---

## 2. Security & Anti-Abuse (DDOS Protection)

**Goal**: Remove anonymous access and prevent spam/DDOS on uploads and account creation.

### Authentication
-   **Remove Anonymous Auth**: Update `convex/auth.ts` to disable anonymous providers. Require Email or OAuth (Google, etc.).
-   **Cleanup**: Purge dependent logic for anonymous users.

### Rate Limiting (Convex)
-   **Table**: Create a `rate_limits` table to track usage buckets.
-   **Logic**:
    -   **Uploads**: Limit to **150 photos per hour** per user (as requested).
    -   **Account Creation**: Convex Auth handles some of this, but we can verify IP limits if needed (requires HTTP Action wrapper to see IP, or rely on trusted Auth providers).
-   **Implementation**:
    -   Helper function `checkRateLimit(ctx, userId, actionType)` in mutations.
    -   Throw `ConvexError("Rate limit exceeded")` if violated.

### WAF (Cloudflare)
-   Recommend placing the implementation behind Cloudflare Proxy which handles free DDOS protection at the network layer.

---

## 3. Slideshow Logic Enhancements

**Goal**: Smartly refresh the slideshow with new photos without interrupting the current view.

### Logic
1.  **Data Source**: Continue using `useQuery` to get *all* approved photos.
2.  **Client State**: Maintain a local `playlist` array and a `queue` of seen photos.
3.  **Refresh Interval**: `useInterval` (every 60s) to check for diffs between `serverData` and `playlist`.
4.  **Shuffle Injection**:
    -   If new photos arrive:
        -   Filter them out from the current `playlist`.
        -   Insert them at **random positions** into the *remaining* (unseen) portion of the playlist.
        -   If playlist is almost done, append them to the end.
    -   **Initial Load**: Fisher-Yates shuffle the whole list.

---

## 4. UI & Performance

### Query Caching
-   **Convex Caching**: Convex clients automatically cache query results. We don't need "React Query".
-   **Optimization**: Ensure we unsubscribe from heavy queries when off-screen (React handles this with component unmounting).
-   **Pre-fetching**: We can manually pre-load the "All Photos" query on the home page before the user clicks "Gallery".

### Dark Theme
-   **Tailwind Config**: Enable `darkMode: 'class'`.
-   **Theme Context**: Create a `ThemeContext` provider to manage `light` | `dark` | `system`.
-   **Styles**:
    -   Systematically update generic colors: `bg-white` -> `bg-white dark:bg-gray-900`.
    -   Text: `text-gray-900` -> `text-gray-900 dark:text-gray-100`.
    -   Components: Navbar, Cards, Modals.

---

## 5. Execution Order

1.  **Phase 1: Security & Cleanup** (Remove anon auth, add rate limits) - *High Priority to stop spam.*
2.  **Phase 2: R2 Migration** (Set up bucket, keys, upload actions).
3.  **Phase 3**: Image Processing.
4.  **Phase 4**: Slideshow & UI (Dark mode, smart shuffle).

## 6. Testing & Cost Prevention Strategy

To prevent R2 charges during development and testing:

1.  **Local Development (MinIO)**:
    -   Use **MinIO** (a local S3-compatible object storage server) via Docker during development.
    -   Configure the S3 Client to point to `localhost:9000` when `process.env.NODE_ENV === 'development'`.
    -   This allows full end-to-end testing of signed URLs and uploads without touching Cloudflare.

2.  **R2 Free Tier Safety**:
    -   R2 offers **10GB storage + 1 million requests/month** for free.
    -   Development usage is highly unlikely to exceed this, but MinIO guarantees $0 cost and works offline.
    -   **Alerts**: Set up billing alerts in Cloudflare Dashboard at $1 threshold.

## 7. Deployment Strategy

### Convex Deployment
1.  **Production Push**: Run `npx convex deploy` to push schema and functions to the production environment.
2.  **Environment Variables**:
    -   Set R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) in the Convex Dashboard settings (or via `npx convex env set`).
    -   Ensure the tailored `process.env` checks in code handle `production` vs `development` correctly.

### Frontend Deployment (Vite)
1.  **Build**: Run `npm run build` to generate the static site.
2.  **Hosting**: Deploy the `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages).
3.  **Connection**: Ensure `VITE_CONVEX_URL` is set to the **production** Convex URL in your hosting provider's environment variables.
4.  **Custom Domain**:
    -   Configure `www.your-wedding-domain.com` in your hosting provider (e.g., Cloudflare Pages "Custom Domains" tab).
    -   Update DNS records (CNAME) as instructed by the provider.
    -   **Image Worker**: Map `images.your-wedding-domain.com` to your Cloudflare Worker so image URLs look professional.
