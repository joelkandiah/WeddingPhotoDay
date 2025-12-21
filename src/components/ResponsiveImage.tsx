import { useState, useRef, useEffect } from "react";

interface ResponsiveImageUrls {
  mobile: string;
  tablet: string;
  desktop: string;
  full: string;
  blur: string;
}

interface ResponsiveImageProps {
  urls: ResponsiveImageUrls;
  alt: string;
  priority?: boolean;
  className?: string;
  onLoad?: () => void;
}

/**
 * ResponsiveImage component that uses the HTML <picture> element
 * to serve device-appropriate images with blur placeholder loading.
 * 
 * Features:
 * - Blur placeholder that loads first (30x30 max)
 * - Responsive images for mobile, tablet, and desktop
 * - Lazy loading with priority option for first visible image
 * - Smooth transition from blur to full image
 */
export function ResponsiveImage({ 
  urls, 
  alt, 
  priority = false, 
  className = "",
  onLoad 
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showBlur, setShowBlur] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    // If already marked as loaded (e.g. by effect), don't re-trigger animation logic
    if (isLoaded) return;
    
    setIsLoaded(true);
    // Keep blur visible briefly for smooth transition
    setTimeout(() => setShowBlur(false), 100);
    onLoad?.();
  };

  // Check for cached image on mount
  useEffect(() => {
    if (imgRef.current?.complete) {
      setIsLoaded(true);
      setShowBlur(false);
      onLoad?.();
    }
  }, [onLoad]);

  return (
    <div className={`relative bg-black/10 overflow-hidden ${className}`}>
      {/* Blur placeholder - loads first */}
      {showBlur && (
        <img
          src={urls.blur}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 animate-pulse-fade pointer-events-none"
          style={{
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}
      
      {/* Main responsive image using picture element */}
      <picture className="relative">
        {/* Mobile: up to 768px */}
        <source
          media="(max-width: 768px)"
          srcSet={urls.mobile}
          type="image/webp"
        />
        
        {/* Tablet: 769px to 1024px */}
        <source
          media="(min-width: 769px) and (max-width: 1024px)"
          srcSet={urls.tablet}
          type="image/webp"
        />
        
        {/* Desktop: 1025px to 1920px */}
        <source
          media="(min-width: 1025px) and (max-width: 1920px)"
          srcSet={urls.desktop}
          type="image/webp"
        />
        
        {/* Large desktop: above 1920px */}
        <source
          media="(min-width: 1921px)"
          srcSet={urls.full}
          type="image/webp"
        />
        
        {/* Fallback image */}
        <img
          ref={imgRef}
          src={urls.desktop}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={{
            position: 'relative',
            zIndex: 1,
          }}
        />
      </picture>
    </div>
  );
}
