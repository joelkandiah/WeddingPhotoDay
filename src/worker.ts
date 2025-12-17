/**
 * Cloudflare Worker for serving images from R2 with on-demand resizing
 * 
 * This worker:
 * 1. Serves original images from R2 at /images/original/{key}
 * 2. Generates derived images on-demand using Cloudflare Image Resizing
 * 3. Stores derived images back to R2 to reduce repeated transform costs
 * 4. Returns responses with long immutable Cache-Control headers
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
      const isDerived = imageRequest.width || imageRequest.height || imageRequest.format;
      
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
  
  // Expected format: /images/original/{key} or /images/{width}x{height}/{key}
  if (pathParts.length < 3 || pathParts[0] !== 'images') {
    return null;
  }
  
  if (pathParts[1] === 'original') {
    // Original image request
    const key = pathParts.slice(2).join('/');
    return { key };
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
  const quality = url.searchParams.get('quality');
  const format = url.searchParams.get('format');
  
  return {
    key,
    width,
    height,
    quality: quality ? parseInt(quality, 10) : undefined,
    format: format || undefined,
  };
}

/**
 * Generate a storage key for a derived image
 */
function getDerivedImageKey(request: ImageRequest): string {
  const parts = ['derived'];
  
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
 * Transform an image using Cloudflare Image Resizing
 */
async function transformImage(
  original: R2ObjectBody,
  request: ImageRequest
): Promise<{ body: ReadableStream; httpMetadata: R2HTTPMetadata }> {
  const originalBody = await original.arrayBuffer();
  
  // Build cf.image options
  const options: any = {};
  
  if (request.width) {
    options.width = request.width;
  }
  
  if (request.height) {
    options.height = request.height;
  }
  
  if (request.quality) {
    options.quality = request.quality;
  }
  
  if (request.format) {
    options.format = request.format;
  }
  
  // Use Cloudflare Image Resizing via fetch with cf.image
  const response = await fetch('https://example.com/image', {
    method: 'POST',
    body: originalBody,
    // @ts-ignore - cf.image is a Cloudflare-specific feature
    cf: {
      image: options,
    },
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
