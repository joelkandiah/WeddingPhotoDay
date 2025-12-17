/**
 * Cloudflare Worker for serving images from R2 with on-demand resizing
 * 
 * This worker:
 * 1. Serves original images from R2 at /images/original/{key}
 * 2. Serves auto-compressed images at /images/compressed/{key} (default 85% quality, auto format)
 * 3. Generates derived images on-demand using Cloudflare Image Resizing
 * 4. Stores derived images back to R2 to reduce repeated transform costs
 * 5. Returns responses with long immutable Cache-Control headers
 * 
 * Supports HEIC/HEIF images from iPhones - automatically converts to web-friendly formats
 */

interface Env {
  R2_BUCKET: R2Bucket;
  BUCKET_NAME: string;
  PUBLIC_ORIGIN: string;
}

interface ImageRequest {
  key: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  compressed?: boolean;  // For automatic compression without specifying dimensions
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Only handle /images/ paths
    if (!url.pathname.startsWith('/images/')) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      // Parse image request from URL
      const imageRequest = parseImageRequest(url);
      
      if (!imageRequest) {
        return new Response('Invalid image request', { status: 400 });
      }

      // Check if this is a derived image request (has transformation params)
      const isDerived = imageRequest.width || imageRequest.height || imageRequest.format || imageRequest.compressed;
      
      if (isDerived) {
        // For derived images, try to serve from cache first
        const derivedKey = getDerivedImageKey(imageRequest);
        const cachedDerived = await env.R2_BUCKET.get(derivedKey);
        
        if (cachedDerived) {
          return serveFromR2(cachedDerived, true);
        }
        
        // If not cached, fetch original and transform
        const original = await env.R2_BUCKET.get(imageRequest.key);
        
        if (!original) {
          return new Response('Image not found', { status: 404 });
        }
        
        // Transform the image using Cloudflare Image Resizing
        const transformed = await transformImage(original, imageRequest);
        
        // Store the derived image back to R2 for future requests
        ctx.waitUntil(
          env.R2_BUCKET.put(derivedKey, transformed.body, {
            httpMetadata: transformed.httpMetadata,
          })
        );
        
        return serveTransformed(transformed);
      } else {
        // Serve original image from R2
        const object = await env.R2_BUCKET.get(imageRequest.key);
        
        if (!object) {
          return new Response('Image not found', { status: 404 });
        }
        
        return serveFromR2(object, false);
      }
    } catch (error) {
      console.error('Error serving image:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};

/**
 * Parse image request parameters from URL
 */
function parseImageRequest(url: URL): ImageRequest | null {
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Expected format: /images/original/{key}, /images/compressed/{key}, or /images/{width}x{height}/{key}
  if (pathParts.length < 3 || pathParts[0] !== 'images') {
    return null;
  }
  
  if (pathParts[1] === 'original') {
    // Original image request - no transformations
    const key = pathParts.slice(2).join('/');
    return { key };
  }
  
  if (pathParts[1] === 'compressed') {
    // Compressed image request - auto quality/format optimization
    // Defaults to 85% quality and automatic format selection (HEIC → WebP/JPEG)
    const key = pathParts.slice(2).join('/');
    const qualityParam = url.searchParams.get('quality');
    const format = url.searchParams.get('format');
    
    // Parse and validate quality parameter
    let quality = 85; // default
    if (qualityParam) {
      const parsed = parseInt(qualityParam, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
        quality = parsed;
      }
    }
    
    return {
      key,
      compressed: true,
      quality,
      format: format || 'auto',
    };
  }
  
  // Derived image request - parse dimensions
  const dimMatch = pathParts[1].match(/^(\d+)?x(\d+)?$/);
  if (!dimMatch) {
    return null;
  }
  
  const width = dimMatch[1] ? parseInt(dimMatch[1], 10) : undefined;
  const height = dimMatch[2] ? parseInt(dimMatch[2], 10) : undefined;
  const key = pathParts.slice(2).join('/');
  
  // Parse quality and format from query params
  const qualityParam = url.searchParams.get('quality');
  const format = url.searchParams.get('format');
  
  // Parse and validate quality parameter
  let quality: number | undefined = undefined;
  if (qualityParam) {
    const parsed = parseInt(qualityParam, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
      quality = parsed;
    }
  }
  
  return {
    key,
    width,
    height,
    quality,
    format: format || undefined,
  };
}

/**
 * Generate a storage key for a derived image
 */
function getDerivedImageKey(request: ImageRequest): string {
  const parts = ['derived'];
  
  if (request.compressed) {
    parts.push('compressed');
  }
  
  if (request.width || request.height) {
    parts.push(`${request.width || ''}x${request.height || ''}`);
  }
  
  if (request.quality) {
    parts.push(`q${request.quality}`);
  }
  
  if (request.format) {
    parts.push(request.format);
  }
  
  parts.push(request.key);
  
  return parts.join('/');
}

/**
 * Interface for Cloudflare Image Resizing options
 * See: https://developers.cloudflare.com/images/transform-images/transform-via-workers/
 * 
 * Note: Cloudflare automatically handles HEIC/HEIF images from iPhones and converts
 * them to web-friendly formats. Using format: 'auto' lets Cloudflare choose the best
 * output format based on browser support (WebP for modern browsers, JPEG for others).
 */
interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'avif' | 'auto';
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
}

/**
 * Transform an image using Cloudflare Image Resizing
 * Note: This uses Cloudflare's Image Resizing service which requires
 * the service to be enabled in your Cloudflare account
 * 
 * Supports HEIC/HEIF images from iPhones - automatically converts to web-friendly formats
 */
async function transformImage(
  original: R2ObjectBody,
  request: ImageRequest
): Promise<{ body: ReadableStream; httpMetadata: R2HTTPMetadata }> {
  const originalBody = await original.arrayBuffer();
  
  // Build cf.image options for Cloudflare Image Resizing
  const options: ImageTransformOptions = {};
  
  if (request.width) {
    options.width = request.width;
  }
  
  if (request.height) {
    options.height = request.height;
  }
  
  // Default quality for compression
  if (request.quality !== undefined) {
    options.quality = request.quality;
  }
  
  // Handle format - 'auto' lets Cloudflare choose best format (WebP for modern browsers)
  if (request.format) {
    options.format = request.format as ImageTransformOptions['format'];
  }
  
  // For compressed images, always use scale-down to preserve aspect ratio
  // and prevent upscaling regardless of whether dimensions are specified
  if (request.compressed) {
    options.fit = 'scale-down';
  }
  
  // Use Cloudflare Image Resizing via fetch with cf.image
  // The URL here is a placeholder - Cloudflare Image Resizing processes the body
  // See: https://developers.cloudflare.com/images/transform-images/transform-via-workers/
  const response = await fetch('https://placeholder.invalid/transform', {
    method: 'POST',
    body: originalBody,
    cf: {
      image: options,
    } as RequestInit['cf'] & { image: ImageTransformOptions },
  });
  
  if (!response.ok || !response.body) {
    throw new Error('Image transformation failed');
  }
  
  return {
    body: response.body,
    httpMetadata: {
      contentType: response.headers.get('content-type') || original.httpMetadata?.contentType || 'image/jpeg',
    },
  };
}

/**
 * Serve an image from R2 with appropriate headers
 */
function serveFromR2(object: R2ObjectBody, isDerived: boolean): Response {
  const headers = new Headers();
  
  // Set content type
  if (object.httpMetadata?.contentType) {
    headers.set('Content-Type', object.httpMetadata.contentType);
  }
  
  // Set cache control - immutable for 1 year
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  
  // Set ETag if available
  if (object.etag) {
    headers.set('ETag', object.etag);
  }
  
  return new Response(object.body, { headers });
}

/**
 * Serve a transformed image with appropriate headers
 */
function serveTransformed(transformed: { body: ReadableStream; httpMetadata: R2HTTPMetadata }): Response {
  const headers = new Headers();
  
  if (transformed.httpMetadata.contentType) {
    headers.set('Content-Type', transformed.httpMetadata.contentType);
  }
  
  // Set cache control - immutable for 1 year
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  
  return new Response(transformed.body, { headers });
}
