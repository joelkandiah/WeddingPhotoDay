import { useState, useRef, useEffect, TouchEvent, MouseEvent as ReactMouseEvent } from "react";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  onImageClick?: (index: number) => void;
  className?: string;
  aspectRatio?: "video" | "square" | "cover" | "contain" | "auto";
}

export function ImageCarousel({ 
  images, 
  alt, 
  onImageClick, 
  className = "",
  aspectRatio = "square" // Default to square as requested
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [prevTranslate, setPrevTranslate] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(null);

  // Reset state when images change
  useEffect(() => {
    setCurrentIndex(0);
    setCurrentTranslate(0);
    setPrevTranslate(0);
  }, [images]);

  const snapToSlide = (index: number) => {
    if (!carouselRef.current) return;
    const containerWidth = carouselRef.current.offsetWidth;
    const translate = index * -containerWidth;
    setCurrentTranslate(translate);
    setPrevTranslate(translate);
    setCurrentIndex(index);
  };

  const nextSlide = (e?: ReactMouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      snapToSlide(currentIndex + 1);
    } else {
      snapToSlide(0); // Optional: Loop back
    }
  };

  const prevSlide = (e?: ReactMouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      snapToSlide(currentIndex - 1);
    } else {
      snapToSlide(images.length - 1); // Optional: Loop back
    }
  };
  
  const goToSlide = (index: number, e: ReactMouseEvent) => {
    e.stopPropagation();
    snapToSlide(index);
  };

  // Drag Handlers
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const currentPosition = clientX;
    const currentDrag = currentPosition - startX;
    setCurrentTranslate(prevTranslate + currentDrag);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (!carouselRef.current) return;

    const movedBy = currentTranslate - prevTranslate;
    const containerWidth = carouselRef.current.offsetWidth;
    
    // Threshold to change slide (e.g., 20% of width)
    if (movedBy < -containerWidth * 0.2 && currentIndex < images.length - 1) {
      snapToSlide(currentIndex + 1);
    } else if (movedBy > containerWidth * 0.2 && currentIndex > 0) {
      snapToSlide(currentIndex - 1);
    } else {
      snapToSlide(currentIndex);
    }
  };

  // Mouse Events
  const onMouseDown = (e: ReactMouseEvent) => {
    // Only allow left click drag
    if (e.button !== 0) return;
    handleDragStart(e.clientX);
  };
  const onMouseMove = (e: ReactMouseEvent) => {
    if (isDragging) e.preventDefault();
    handleDragMove(e.clientX);
  };
  const onMouseUp = () => handleDragEnd();
  const onMouseLeave = () => {
    if (isDragging) handleDragEnd();
  };

  // Touch Events
  const onTouchStart = (e: TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };
  const onTouchMove = (e: TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };
  const onTouchEnd = () => handleDragEnd();

  // Resize Observer to keep alignment
  useEffect(() => {
    const handleResize = () => {
      snapToSlide(currentIndex);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentIndex, images.length]);


  if (!images.length) return null;

  return (
    <div className={`relative group overflow-hidden select-none ${className}`}>
      <div 
        ref={carouselRef}
        className={`w-full relative overflow-hidden bg-gray-100 ${
          aspectRatio === "square" ? "aspect-square" : 
          aspectRatio === "video" ? "aspect-video" : 
          aspectRatio === "auto" ? "aspect-square" : // Auto falls back to square for consistent sizing
          "h-full" // contain/cover should fill the parent
        }`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className={`flex w-full h-full cursor-grab active:cursor-grabbing ${
            isDragging ? "" : "transition-transform duration-300 ease-out"
          }`}
          style={{ transform: `translateX(${currentTranslate}px)` }}
        >
          {images.map((src, idx) => (
            <div 
              key={`${src}-${idx}`}
              className="w-full shrink-0 h-full flex items-center justify-center p-1 dark:bg-black/80"
              onClick={() => {
                if (!isDragging) onImageClick?.(idx);
              }}
            >
              <CarouselSlide 
                src={src} 
                alt={`${alt} ${idx + 1}`}
                priority={idx === currentIndex || idx === currentIndex + 1}
              />
            </div>
          ))}
        </div>
      </div>

      {images.length > 1 && (
        <>
          {/* Left Arrow */}
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Previous image"
          >
            ←
          </button>

          {/* Right Arrow */}
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Next image"
          >
            →
          </button>

          {/* Dots */}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => goToSlide(idx, e)}
                className={`w-2 h-2 rounded-full transition-all pointer-events-auto ${
                  currentIndex === idx
                    ? "bg-white w-4"
                    : "bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
          
          {/* Counter Badge */}
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-5 pointer-events-none">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

// Sub-component to handle individual image loading state
function CarouselSlide({ src, alt, priority }: { src: string, alt: string, priority: boolean }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="w-full h-full relative flex items-center justify-center">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-black/90 animate-pulse rounded-lg">
          <svg className="w-10 h-10 text-gray-300 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-contain pointer-events-none transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
