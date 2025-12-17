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

The Cloudflare Worker serves images from R2 with on-demand resizing capabilities.

1. **Install Wrangler (Cloudflare Workers CLI):**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare:**
   ```bash
   wrangler login
   ```

3. **Configure environment variables for the Worker:**
   
   Edit `wrangler.toml` to set your bucket name, or set via secrets:
   ```bash
   wrangler secret put BUCKET_NAME
   # Enter: your-bucket-name
   
   wrangler secret put PUBLIC_ORIGIN
   # Enter: https://your-worker.workers.dev (or your custom domain)
   ```

4. **Create R2 bucket binding:**
   
   The `wrangler.toml` already includes the R2 bucket binding configuration. Make sure the bucket name matches your actual R2 bucket.

5. **Deploy the Worker:**
   ```bash
   wrangler deploy
   ```

6. **Test the Worker:**
   
   After deployment, you can access images at:
   - Original: `https://your-worker.workers.dev/images/original/{storage-key}`
   - Resized: `https://your-worker.workers.dev/images/800x600/{storage-key}`
   - Custom format: `https://your-worker.workers.dev/images/1200x/{storage-key}?format=webp&quality=80`

### Image URL Patterns

The Worker supports the following URL patterns:

- **Original images:** `/images/original/{key}`
- **Width only:** `/images/{width}x/{key}` (maintains aspect ratio)
- **Height only:** `/images/x{height}/{key}` (maintains aspect ratio)
- **Both dimensions:** `/images/{width}x{height}/{key}`
- **Query parameters:**
  - `?quality=80` - Set JPEG/WebP quality (1-100)
  - `?format=webp` - Convert to WebP, JPEG, PNG, etc.

### How the Upload Flow Works

1. Client calls `api.posts.generateUploadUrl()` or `api.photos.generateUploadUrl()`
2. The Convex backend delegates to the R2 component to generate an upload URL
3. Client uploads the file directly to R2 via the upload URL
4. R2 component syncs metadata back to Convex
5. The Worker serves images from R2 with automatic resizing and caching

## App authentication

This app uses **sitewide login** with [Convex Auth](https://auth.convex.dev/). Users enter a single password to access the site, and the backend automatically determines their role (user or admin) based on which password matches.

### Setting up passwords

To configure the site passwords, set the following environment variables in your Convex deployment:

- `USER_PASSWORD` - Password for regular users (default: `user123`)
- `ADMIN_PASSWORD` - Password for admin users (default: `admin123`)

**Important:** The default passwords are for development only. Change them before deploying to production!

To set environment variables in Convex:
```bash
npx convex env set USER_PASSWORD your_user_password
npx convex env set ADMIN_PASSWORD your_admin_password
```

**Security Notes:**
- Passwords are compared using constant-time comparison to prevent timing attacks
- For production, use strong, unique passwords for both roles
- The current implementation uses plain text passwords stored in environment variables
- For enhanced security, consider implementing bcrypt hashing for password storage

### How it works

1. Users see a simple password input on the homepage
2. When they submit the password, the backend checks if it matches either the user or admin password
3. If it matches the admin password, they're logged in as admin with access to approve/reject photos
4. If it matches the user password, they're logged in as a regular user who can upload and view photos
5. Invalid passwords are rejected

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
