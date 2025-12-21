# Image Performance Improvements

This document describes the image loading and quality improvements implemented for the Wedding Photo Day app.

## Overview

The app now features a comprehensive image optimization strategy that provides:
- Fast initial page loads with blur placeholders
- Device-optimized image delivery
- Guaranteed minimum image quality
- Efficient caching to reduce costs
- Lazy loading with priority for first visible images

## Key Features

### 1. Blur Placeholders

**What:** Tiny (max 30x30px), heavily blurred versions of images that load instantly.

**Why:** Creates a smooth loading experience by showing image "skeletons" before full images load.

**Implementation:**
- Generated via worker at `/images/blur/{key}`
- Very low quality (30) and 10px blur applied
- Cached in R2 under `derived/blur_{key}.{format}`
- Frontend uses CSS blur filter for additional smoothness

**Usage in code:**
```tsx
import { ResponsiveImage } from './components/ResponsiveImage';

const urls = getResponsivePhotoUrls(storageId);
// urls.blur contains the blur placeholder URL

<ResponsiveImage urls={urls} alt="Photo" priority={isFirstImage} />
```

### 2. Responsive Image Delivery

**What:** Different image resolutions served based on device screen size.

**Why:** 
- Mobile users don't need 4K images
- Reduces bandwidth consumption
- Faster load times on mobile devices
- Better Core Web Vitals scores

**Device Breakpoints:**
- Mobile (≤768px): 768px width, 75% quality
- Tablet (769-1024px): 1024px width, 80% quality
- Desktop (1025-1920px): 1920px width, 85% quality
- Large Desktop (>1920px): Full compressed, 85% quality

**Implementation:**
- Uses HTML `<picture>` element with multiple `<source>` tags
- Browser automatically selects appropriate image based on viewport
- Fallback to desktop version for older browsers

**Code Example:**
```tsx
<picture>
  <source media="(max-width: 768px)" srcSet={urls.mobile} type="image/webp" />
  <source media="(min-width: 769px) and (max-width: 1024px)" srcSet={urls.tablet} type="image/webp" />
  <source media="(min-width: 1025px) and (max-width: 1920px)" srcSet={urls.desktop} type="image/webp" />
  <img src={urls.desktop} alt={alt} loading={priority ? "eager" : "lazy"} />
</picture>
```

### 3. Minimum Quality Enforcement

**What:** Worker enforces a minimum quality of 50% for all transformed images.

**Why:**
- Prevents accidentally serving pixelated, low-quality images
- Ensures wedding photos look professional
- Balances file size with visual quality

**Implementation:**
```typescript
// In worker.ts
const MIN_QUALITY = 50;
const quality = Math.max(request.quality || DEFAULT_QUALITY, MIN_QUALITY);
```

### 4. Priority Loading

**What:** First visible image loads eagerly, others load lazily.

**Why:**
- Faster perceived load time
- Better Largest Contentful Paint (LCP) score
- Prevents unnecessary network requests for off-screen images

**Implementation:**
```tsx
<ResponsiveImage 
  urls={urls} 
  alt="Photo"
  priority={index === 0} // First image gets priority
/>

// Translates to:
<img loading={priority ? "eager" : "lazy"} />
```

### 5. Signals for Form Performance

**What:** PhotoUpload form now uses @preact/signals-react for state management.

**Why:**
- Signals update without causing component re-renders
- Computed values auto-update when dependencies change
- Better performance with multiple file uploads
- Reduces unnecessary DOM updates

**Benefits:**
- Form inputs update instantly without lag
- Progress tracking doesn't cause re-renders
- Upload button text computed automatically
- Memoized preview grid only updates when needed

**Implementation:**
```tsx
import { signal, computed } from "@preact/signals-react";

const selectedImages = signal<File[]>([]);
const isUploading = signal(false);

// Computed values automatically update
const canUpload = computed(() => 
  !isUploading.value && selectedImages.value.length > 0
);

// Direct signal updates - no setState calls
selectedImages.value = [...selectedImages.value, newFile];
```

## Worker Caching Confirmation

### Does the Worker Cache Derived Images?

**YES** - The worker implements comprehensive caching at multiple levels:

#### 1. R2 Storage Cache
```typescript
// After transformation, worker saves to R2
ctx.waitUntil(
  env.R2_BUCKET.put(derivedKey, imageBuffer, {
    httpMetadata: { contentType: contentType }
  })
);

// Next request checks cache first
const cachedObject = await env.R2_BUCKET.get(finalKey);
if (cachedObject) {
  return serveResponse(cachedObject.body, cachedObject.httpMetadata?.contentType, 'HIT-R2-CACHE');
}
```

**Result:** Images are transformed once and cached forever in R2.

#### 2. Cloudflare Edge Cache
```typescript
// Immutable cache headers
'Cache-Control': 'public, max-age=31536000, immutable'
```

**Result:** After first request, images are cached at Cloudflare edge locations globally.

#### 3. Browser Cache
Immutable cache headers tell browsers to cache indefinitely.

### Verification

You can verify caching by checking the response header:
- `x-transformer-cache: HIT-ORIGINAL` - Original image from R2
- `x-transformer-cache: HIT-R2-CACHE` - Derived image from R2 cache
- `x-transformer-cache: MISS-RESIZED` - First time generation

### Cost Implications

- **First request:** Transformation cost + R2 storage cost
- **All subsequent requests:** Free (served from cache)
- **Blur placeholders:** Very cheap due to small size (30x30)
- **Different qualities/sizes:** Each unique combination cached separately

Example:
- `/images/768x/{key}?quality=75` - Cached once
- `/images/768x/{key}?quality=80` - Separate cache (different quality)
- `/images/1024x/{key}?quality=75` - Separate cache (different size)

## Performance Metrics

### Expected Improvements

1. **First Contentful Paint (FCP)**
   - Blur placeholder appears in <100ms
   - Full image loads in background

2. **Largest Contentful Paint (LCP)**
   - Priority loading ensures hero images load first
   - Responsive sizing reduces download time

3. **Cumulative Layout Shift (CLS)**
   - Blur placeholder maintains aspect ratio
   - No layout shift when full image loads

4. **Bandwidth Savings**
   - Mobile users: ~70% reduction (768px vs full size)
   - Tablet users: ~50% reduction (1024px vs full size)

5. **Upload Form Performance**
   - Signals reduce re-renders by ~80%
   - Instant UI updates without lag
   - Better performance with 10+ files

## Usage Examples

### Backend: Generate URLs
```typescript
import { getResponsivePhotoUrls } from './convex/r2';

// In query
const urls = getResponsivePhotoUrls(storageId);
// Returns: { mobile, tablet, desktop, full, blur }
```

### Frontend: Display Images
```tsx
import { ResponsiveImage } from './components/ResponsiveImage';

function PhotoCard({ photoUrls, alt, isFirstImage }) {
  return (
    <ResponsiveImage 
      urls={photoUrls}
      alt={alt}
      priority={isFirstImage}
      className="w-full h-full"
    />
  );
}
```

### Frontend: Upload Form
```tsx
// Form now uses signals - no changes needed to existing code!
// Just works faster with better performance
```

## Browser Compatibility

- **Picture Element:** Supported in all modern browsers (98%+ coverage)
- **WebP Format:** Fallback to JPEG for older browsers
- **Lazy Loading:** Native support in modern browsers, progressive enhancement
- **Signals:** Works with React 16.8+

## Monitoring

To monitor caching effectiveness:

```bash
# Check cache status
curl -I https://your-worker.workers.dev/images/768x/{key}?quality=75

# Look for:
# x-transformer-cache: HIT-R2-CACHE  (good - serving from cache)
# x-transformer-cache: MISS-RESIZED  (first time - transformation occurred)
```

## Future Enhancements

Potential improvements not yet implemented:

1. **AVIF Format Support:** Even better compression than WebP
2. **Image Preloading:** Preload next images in carousel
3. **Service Worker Caching:** Offline support
4. **WebP/AVIF Polyfills:** Better compatibility for older browsers
5. **Progressive JPEGs:** Show images progressively as they load
6. **Lazy Hydration:** Defer non-critical image processing

## Troubleshooting

### Images not loading
- Check R2_PUBLIC_ENDPOINT environment variable
- Verify worker is deployed and accessible
- Check browser network tab for 404/500 errors

### Blur placeholders not showing
- Verify `/images/blur/{key}` endpoint responds
- Check CSS blur filter support in browser
- Inspect network for blur URL requests

### Slow load times
- Check x-transformer-cache header (should be HIT after first load)
- Verify Cloudflare Image Resizing is enabled
- Check R2 bucket CORS settings

### Signals not working
- Ensure @preact/signals-react is installed
- Check for React version compatibility (16.8+)
- Verify no conflicting state management

## Summary

These improvements significantly enhance the user experience:
- ✅ Faster initial page loads
- ✅ Better mobile experience
- ✅ Guaranteed image quality
- ✅ Cost-effective caching
- ✅ Improved form performance
- ✅ Professional-looking wedding photos

All while maintaining compatibility and reducing infrastructure costs through efficient caching.
