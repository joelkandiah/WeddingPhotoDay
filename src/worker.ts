interface Env {
  R2_BUCKET: R2Bucket;
  BUCKET_NAME: string;
}

interface ImageRequest {
  key: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  compressed?: boolean;
  blur?: boolean;
}

// Configuration constants
const DEFAULT_QUALITY = 85;
const THUMBNAIL_QUALITY = 60; // Used for thumbnail/preview URLs
const MIN_QUALITY = 50; // Minimum quality allowed to ensure good image quality
const BLUR_PLACEHOLDER_SIZE = 30; // Maximum dimension for blur placeholder
const BLUR_PLACEHOLDER_QUALITY = 30; // Low quality for blur placeholders
const MAX_DIMENSION = 7680; // 8K resolution limit (7680x4320) to prevent DoS attacks and excessive memory usage

// Device-specific maximum resolutions
const MOBILE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1024;
const DESKTOP_MAX_WIDTH = 1920;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Filter for image paths
    if (!url.pathname.startsWith('/images/')) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const imageRequest = parseImageRequest(url);
      if (!imageRequest) return new Response('Invalid Request', { status: 400 });

      // 2. Prevent Infinite Loops
      // If the request has our internal header, serve directly from R2 without logic
      if (request.headers.get('x-source') === 'image-resizer') {
        const object = await env.R2_BUCKET.get(imageRequest.key);
        if (!object) return new Response('Not Found', { status: 404 });
        return new Response(object.body, {
          headers: { 'Content-Type': object.httpMetadata?.contentType || 'image/jpeg' }
        });
      }

      // 3. Handle Original Images
      const isDerived = !!(imageRequest.width || imageRequest.height || imageRequest.format || imageRequest.compressed || imageRequest.blur);
      if (!isDerived) {
        const object = await env.R2_BUCKET.get(imageRequest.key);
        if (!object) return new Response('Not Found', { status: 404 });
        return serveResponse(object.body, object.httpMetadata?.contentType, 'HIT-ORIGINAL');
      }

      // 4. Handle Derived (Resized/Compressed) Images
      // We generate a base key, but the final R2 key depends on the output format (webp/jpeg/etc)
      const baseDerivedKey = getDerivedImageBaseKey(imageRequest);

      // Check if we already have a cached version for the requested format
      // Note: If format is 'auto', we first need to see what the browser supports
      const targetFormat = imageRequest.format === 'auto' ? getBestFormat(request) : (imageRequest.format || 'webp');
      const finalKey = `${baseDerivedKey}.${targetFormat}`;

      // OPTIMIZATION: Cloudflare Cache API Integration
      // To prevent race conditions where multiple concurrent requests trigger duplicate transformations,
      // you can use Cloudflare's Cache API to coordinate requests:
      //
      // const cache = caches.default;
      // const cacheKey = new Request(`https://cache/${finalKey}`, { method: 'GET' });
      // let cachedResponse = await cache.match(cacheKey);
      // if (cachedResponse) return cachedResponse;
      //
      // Then after transformation:
      // const responseToCache = new Response(imageBuffer, { headers: ... });
      // ctx.waitUntil(cache.put(cacheKey, responseToCache.clone()));
      //
      // This provides faster CDN-level caching and prevents duplicate transformations during
      // concurrent requests. The R2 cache below serves as a durable backup.

      const cachedObject = await env.R2_BUCKET.get(finalKey);
      if (cachedObject) {
        return serveResponse(cachedObject.body, cachedObject.httpMetadata?.contentType, 'HIT-R2-CACHE');
      }

      // 5. MISS - Trigger Cloudflare Image Resizing
      const transformed = await transformViaResizer(imageRequest, url.origin);

      // Buffer the result to save to R2 and return to user
      const imageBuffer = await transformed.arrayBuffer();
      const contentType = transformed.headers.get('content-type') || 'image/jpeg';

      // Update key if the resizer gave us something different than expected
      const actualExtension = contentType.split('/')[1] || 'jpg';
      const actualKey = `${baseDerivedKey}.${actualExtension}`;

      // Store in R2 for future requests
      ctx.waitUntil(
        env.R2_BUCKET.put(actualKey, imageBuffer, {
          httpMetadata: { contentType: contentType }
        }).catch((err) => {
          console.error('Failed to store derived image in R2', {
            key: actualKey,
            error: err instanceof Error ? err.message : String(err),
          });
        })
      );

      return serveResponse(imageBuffer, contentType, 'MISS-RESIZED');

    } catch (error) {
      console.error('Worker Error:', error);
      
      // Provide more specific error responses
      if (error instanceof Error) {
        if (error.message.includes('Not Found') || error.message.includes('not found')) {
          return new Response('Image not found', { status: 404 });
        }
        if (error.message.includes('Resizing')) {
          return new Response('Image transformation failed', { status: 502 });
        }
      }
      
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

/**
 * Triggers Cloudflare Resizing by fetching the "Original" URL from itself
 */
async function transformViaResizer(request: ImageRequest, origin: string): Promise<Response> {
  // Handle blur placeholders: small dimensions, low quality
  if (request.blur) {
    const resizingOptions = {
      width: BLUR_PLACEHOLDER_SIZE,
      height: BLUR_PLACEHOLDER_SIZE,
      quality: BLUR_PLACEHOLDER_QUALITY,
      format: request.format || 'auto',
      fit: 'cover',
      blur: 10, // Apply blur to the placeholder
    };

    const originalUrl = `${origin}/images/original/${request.key}`;

    const res = await fetch(originalUrl, {
      headers: { 'x-source': 'image-resizer' },
      cf: { image: resizingOptions }
    });

    if (!res.ok) throw new Error('Resizing service failed');
    return res;
  }

  // Regular image transformation with minimum quality enforcement
  const hasDimensions = typeof request.width === 'number' || typeof request.height === 'number';
  const quality = request.quality || DEFAULT_QUALITY;
  const resizingOptions = {
    width: request.width,
    height: request.height,
    quality: Math.max(quality, MIN_QUALITY), // Enforce minimum quality
    format: request.format || 'auto',
    fit: hasDimensions ? 'cover' : 'scale-down',
  };

  const originalUrl = `${origin}/images/original/${request.key}`;

  const res = await fetch(originalUrl, {
    headers: { 'x-source': 'image-resizer' },
    cf: { image: resizingOptions }
  });

  if (!res.ok) throw new Error('Resizing service failed');
  return res;
}

/**
 * Helpers
 */
function isValidKey(key: string): boolean {
  // Disallow empty keys, path traversal, and absolute-style paths
  if (!key) return false;
  if (key.startsWith('/')) return false;
  if (key.includes('..')) return false;
  if (key.includes('\\')) return false;
  return true;
}

function parseImageRequest(url: URL): ImageRequest | null {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 3) return null;

  const key = parts.slice(2).join('/');
  if (!isValidKey(key)) return null;

  if (parts[1] === 'original') return { key };

  // Validate and parse quality parameter (1-100)
  const qualityParam = url.searchParams.get('quality');
  let quality = DEFAULT_QUALITY;
  if (qualityParam) {
    const parsed = parseInt(qualityParam, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      quality = parsed;
    }
  }

  // Validate format parameter
  const formatParam = url.searchParams.get('format');
  const validFormats = ['webp', 'jpeg', 'png', 'avif', 'auto'];
  const format = formatParam && validFormats.includes(formatParam) ? formatParam : 'auto';

  // Check for blur placeholder request
  const blurParam = url.searchParams.get('blur');
  const isBlur = blurParam === 'true' || blurParam === '1';

  if (parts[1] === 'blur') {
    return {
      key,
      blur: true,
      format
    };
  }

  if (parts[1] === 'compressed') {
    return {
      key,
      compressed: true,
      quality,
      format,
      blur: isBlur
    };
  }

  const dimMatch = parts[1].match(/^(\d+)?x(\d+)?$/);
  if (dimMatch) {
    const width = dimMatch[1] ? parseInt(dimMatch[1]) : undefined;
    const height = dimMatch[2] ? parseInt(dimMatch[2]) : undefined;
    
    // Validate dimensions against MAX_DIMENSION to prevent DoS attacks
    if ((width && width > MAX_DIMENSION) || (height && height > MAX_DIMENSION)) {
      return null; // Invalid dimensions
    }

    return {
      key,
      width,
      height,
      quality,
      format,
      blur: isBlur
    };
  }

  return null;
}

function getDerivedImageBaseKey(req: ImageRequest): string {
  // Ensure quality is part of the filename so q=1 and q=85 are different files
  const q = req.quality || DEFAULT_QUALITY;
  
  // Handle blur placeholders specially, include format to prevent cache collisions
  if (req.blur) {
    const fmt = req.format || 'auto';
    return `derived/blur_${fmt}_${req.key}`;
  }
  
  const dims = `${req.width || 0}x${req.height || 0}`;
  return `derived/${dims}_q${q}_${req.key}`;
}

function getBestFormat(request: Request): string {
  const accept = request.headers.get('Accept') || '';
  if (accept.includes('image/avif')) return 'avif';
  if (accept.includes('image/webp')) return 'webp';
  return 'jpeg';
}

function serveResponse(body: any, contentType: string | undefined, cacheStatus: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'x-transformer-cache': cacheStatus
    }
  });
}