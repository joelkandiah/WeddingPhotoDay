# Wedding Photo Sharing App
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).
  
This project is connected to the Convex deployment named [`kindly-horse-40`](https://dashboard.convex.dev/d/kindly-horse-40).
  
## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## Image Storage and Delivery

This app uses **Cloudflare R2** for image storage and **Cloudflare Image Resizing** for on-demand image transformations. Images are served through a Cloudflare Worker that:

1. Serves original images from R2
2. Generates derived images on-demand using Cloudflare Image Resizing
3. Caches derived images back to R2 to reduce transform costs
4. Returns responses with long immutable Cache-Control headers

### Quick Start

**Important:** You may see TypeScript errors in `convex/r2.ts` about missing `components` export until you complete the R2 setup below. This is expected - the types will be generated when you run `npx convex dev`.

### R2 Setup

1. **Install dependencies:**
   ```bash
   npm install @convex-dev/r2
   ```

2. **Create an R2 bucket in Cloudflare:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → R2
   - Create a new bucket (e.g., `wedding-photos`)
   - Note the bucket name for later configuration
   
3. **Add CORS policy to the bucket:**
   - In your R2 bucket settings, click on **Settings** → **CORS Policy**
   - Add a CORS policy allowing GET and PUT requests from your Convex app:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["Content-Type"]
     }
   ]
   ```
   - For production, replace `"*"` with your specific domain

4. **Create an R2 API Token:**
   - On the main R2 page in your Cloudflare dashboard, click **Manage R2 API Tokens**
   - Click **Create API Token**
   - Edit the token name (e.g., "Wedding Photo App")
   - Set permissions to **Object Read & Write**
   - Under **Specify bucket**, select the bucket you created
   - Optionally change TTL
   - Click **Create API Token**
   - On the next screen, save these values:
     - **Access Key ID**: `R2_ACCESS_KEY_ID`
     - **Secret Access Key**: `R2_SECRET_ACCESS_KEY`
     - **Endpoint**: `R2_ENDPOINT` (looks like: `https://<account-id>.r2.cloudflarestorage.com`)
     - You also need your bucket name: `R2_BUCKET`

5. **Configure Convex environment variables:**
   ```bash
   npx convex env set R2_TOKEN your-token-value
   npx convex env set R2_ACCESS_KEY_ID your-access-key-id
   npx convex env set R2_SECRET_ACCESS_KEY your-secret-access-key
   npx convex env set R2_ENDPOINT your-r2-endpoint
   npx convex env set R2_BUCKET your-bucket-name
   npx convex env set R2_PUBLIC_ENDPOINT your-public-endpoint
   ```

6. **Deploy the Convex component:**
   ```bash
   npx convex dev
   ```
   
   This will:
   - Register the R2 component
   - Generate the `components` export in `convex/_generated/api.d.ts`
   - Clear any TypeScript errors in `convex/r2.ts`
   
   For production deployment:
   ```bash
   npx convex deploy
   ```

### Cloudflare Worker Setup

The Cloudflare Worker serves images from R2 with on-demand resizing capabilities using Cloudflare Image Resizing.

**Prerequisites:**
- Cloudflare Images must be enabled on your account (available on paid plans)
- For Image Resizing pricing, see [Cloudflare Images Pricing](https://developers.cloudflare.com/images/pricing/)

1. **Install Wrangler (Cloudflare Workers CLI):**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Edit `wrangler.toml` configuration:**
   
   Open `wrangler.toml` and update the following values:
   - `bucket_name`: Your R2 bucket name (same as created in R2 Setup)
   - `BUCKET_NAME` in vars: Your R2 bucket name
   - `PUBLIC_ORIGIN`: Will be updated after first deployment (see step 5)

4. **Deploy the Worker:**
   ```bash
   wrangler deploy
   ```
   
   After deployment, you'll see the Worker URL (e.g., `https://wedding-photo-worker.your-account.workers.dev`)

5. **Update PUBLIC_ORIGIN:**
   
   Edit `wrangler.toml` and update the `PUBLIC_ORIGIN` variable with your Worker URL from step 4, then redeploy:
   ```bash
   wrangler deploy
   ```

### Image URL Patterns

The Worker supports the following URL patterns with intelligent caching:

- **Original images:** `/images/original/{key}` - Serves the original, unmodified image
- **Blur placeholders:** `/images/blur/{key}` - Generates tiny 30x30 blurred placeholders for instant loading
- **Compressed images:** `/images/compressed/{key}` - Auto-compresses with quality between 50-85 (default: 85)
  - Automatically converts HEIC/HEIF (iPhone photos) to web-friendly formats
  - Query params: `?quality=80` (enforced minimum: 50), `?format=webp` (default: auto)
  - Can request blur placeholder: `?blur=true`
- **Width only:** `/images/{width}x/{key}` - Resizes to specific width (maintains aspect ratio)
- **Height only:** `/images/x{height}/{key}` - Resizes to specific height (maintains aspect ratio)
- **Both dimensions:** `/images/{width}x{height}/{key}` - Resizes to specific dimensions
- **Query parameters (for all derived images):**
  - `?quality=80` - Set JPEG/WebP quality (50-100, enforced minimum: 50)
  - `?format=webp` - Convert to WebP, JPEG, PNG, AVIF, or 'auto' (browser-specific)
  - `?blur=true` - Request blur placeholder version

**Responsive Image URLs (recommended for best performance):**
The app now uses device-optimized URLs:
- Mobile (≤768px): `/images/768x/{key}?quality=75`
- Tablet (769-1024px): `/images/1024x/{key}?quality=80`
- Desktop (1025-1920px): `/images/1920x/{key}?quality=85`
- Large Desktop (>1920px): `/images/compressed/{key}?quality=85`

**Example URLs:**
```
/images/original/{key}                    # Original, unmodified
/images/blur/{key}                        # Blur placeholder (30x30, 10px blur)
/images/compressed/{key}                  # Auto-compressed (85% quality, auto format)
/images/compressed/{key}?quality=75       # Compressed with custom quality (min: 50)
/images/768x/{key}?quality=75             # Mobile-optimized (768px wide)
/images/1024x/{key}?quality=80            # Tablet-optimized (1024px wide)
/images/1920x/{key}?quality=85            # Desktop-optimized (1920px wide)
/images/1200x800/{key}?format=webp        # Specific dimensions as WebP
```

**HEIC/HEIF Support:** iPhone photos in HEIC format are automatically detected and converted to web-friendly formats (WebP for modern browsers, JPEG for others) by Cloudflare Image Resizing.

### Image Caching Strategy

The Worker implements an efficient multi-tier caching system to minimize transformation costs and improve performance:

1. **R2 Bucket Cache (Durable Storage)**
   - All derived images are automatically cached in R2 under the `derived/` prefix
   - Cache keys include quality and dimensions: `derived/1920x0_q85_{key}.webp`
   - Blur placeholders: `derived/blur_{key}.webp`
   - **Once transformed, images are served directly from R2 without re-transformation**
   - Cache is immutable - transformations only happen once per unique combination

2. **Cloudflare CDN Cache**
   - All responses include `Cache-Control: public, max-age=31536000, immutable`
   - Images are cached globally at Cloudflare's edge locations
   - Subsequent requests from the same region are served from CDN, bypassing the worker entirely

3. **Browser Cache**
   - Immutable cache headers tell browsers to cache indefinitely
   - Resources never need revalidation

**Performance Benefits:**
- First request: Transform image via Cloudflare Image Resizing → Save to R2 → Return to client
- Second request (same params): Serve directly from R2 cache (no transformation)
- Third+ requests: Serve from Cloudflare edge cache (doesn't even hit the worker)

**Cost Optimization:**
- Transformations are billed once per unique image/quality/dimension combination
- All subsequent requests are free (served from R2 or edge cache)
- Blur placeholders (30x30) cost negligible compute due to small size

### How the Upload Flow Works

1. Client calls `api.posts.generateUploadUrl()` or `api.photos.generateUploadUrl()`
2. The Convex backend delegates to the R2 component to generate an upload URL
3. Client uploads the file directly to R2 via the upload URL
4. R2 component syncs metadata back to Convex
5. The Worker serves images from R2 with automatic resizing and caching

### Testing the Integration

After deployment, test the setup:

1. **Test file upload:**
   - Run `npm run dev` to start the app
   - Navigate to the upload page
   - Upload a test image
   - Verify it appears in your R2 bucket via the Cloudflare Dashboard

2. **Test image serving (via Worker):**
   
   Once you have uploaded images, test the Worker URLs:
   ```bash
   # Original image (unmodified)
   curl -I https://your-worker.workers.dev/images/original/{your-image-key}
   
   # Compressed image (recommended - auto-quality, HEIC converted to WebP/JPEG)
   curl -I https://your-worker.workers.dev/images/compressed/{your-image-key}
   
   # Compressed with custom quality
   curl -I https://your-worker.workers.dev/images/compressed/{your-image-key}?quality=75
   
   # Resized image (800px wide)
   curl -I https://your-worker.workers.dev/images/800x/{your-image-key}
   
   # Custom format and quality
   curl -I https://your-worker.workers.dev/images/1200x800/{your-image-key}?format=webp&quality=85
   ```
   
   All requests should return `200 OK` with appropriate `Content-Type` and `Cache-Control` headers.

3. **Verify caching:**
   - Make the same request twice
   - The first request transforms the image
   - The second request serves the cached version from R2
   - Check your R2 bucket - you should see derived images in `derived/compressed/` or `derived/{width}x{height}/` prefixes

## App authentication

This app uses **email and password authentication** with [Convex Auth](https://auth.convex.dev/). Users can:
- Sign up with email, name, and password
- Sign in with email and password
- Reset their password if forgotten

### Password Reset

The app includes a password reset feature that allows users to reset their password via email. See [PASSWORD_RESET_SETUP.md](./PASSWORD_RESET_SETUP.md) for complete setup instructions.

**Quick setup:**
1. Sign up for a free account at [resend.com](https://resend.com)
2. Get your API key from the Resend dashboard
3. Set the required environment variable:
   ```bash
   npx convex env set RESEND_API_KEY your_resend_api_key
   ```

**Optional configuration:**
```bash
# Custom from email (requires verified domain in Resend)
npx convex env set RESEND_FROM_EMAIL "Your App <noreply@yourdomain.com>"

# Production site URL
npx convex env set SITE_URL https://your-production-domain.com
```

### User Roles

Users are automatically assigned a role based on their account:
- **Regular users** can upload photos and view the gallery
- **Admin users** have additional privileges to approve/reject photos

### How it works

1. Users can sign up with their email and password
2. Users can sign in with their credentials
3. If a user forgets their password, they can click "Forgot password?" to receive a reset link via email
4. The reset link is valid for 15 minutes and allows setting a new password

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
