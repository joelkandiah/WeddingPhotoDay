import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect, useRef, useMemo } from "react";
import { PostCategory } from "../../convex/constants";

interface SlideshowContentProps {
  category: PostCategory | "All Posts";
}

export function SlideshowContent({ category }: SlideshowContentProps) {
  const posts = useQuery(api.posts.getApprovedPosts, {
    category: category === "All Posts" ? undefined : category,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalDuration, setIntervalDuration] = useState(5000);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const slideshowRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten posts into individual photos
  const photos = useMemo(() => {
    if (!posts) return [];
    return posts.flatMap(post =>
      post.photoUrls.map(url => ({
        _id: post._id + url,
        url,
        caption: post.caption,
        uploaderName: post.uploaderName,
        _creationTime: post._creationTime,
      }))
    );
  }, [posts]);

  // Reset index when photos change (e.g. category switch)
  useEffect(() => {
    setCurrentIndex(0);
  }, [category]);

  const currentPhoto = photos[currentIndex];

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!slideshowRef.current) return;
    if (!document.fullscreenElement) {
      await slideshowRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  };

  // Auto-hide controls in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }

    const handleMouseMove = () => {
      setShowControls(true);
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    handleMouseMove();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    };
  }, [isFullscreen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "Escape":
          if (isFullscreen) exitFullscreen();
          break;
        case "ArrowLeft":
          prevPhoto();
          break;
        case "ArrowRight":
          nextPhoto();
          break;
        case " ":
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying, isFullscreen, photos.length]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || photos.length === 0) return;
    const timer = setInterval(() => setCurrentIndex(prev => (prev + 1) % photos.length), intervalDuration);
    return () => clearInterval(timer);
  }, [isPlaying, photos, intervalDuration]);

  const nextPhoto = () => setCurrentIndex(prev => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);

  if (posts === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-2xl font-bold text-fg mb-2">No photos for slideshow</h3>
        <p className="text-accent-text">Upload and approve some photos to start the slideshow!</p>
      </div>
    );
  }

  return (
    <div className="slideshow-container">
      {/* Controls (play, fullscreen, interval) */}
      {!isFullscreen && (
        <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
          <button
            onClick={() => setIsPlaying(prev => !prev)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              isPlaying ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {isPlaying ? "⏸️ Pause" : "▶️ Play"}
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-6 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all"
          >
            ⛶ Fullscreen
          </button>

          <select
            value={intervalDuration}
            onChange={e => setIntervalDuration(Number(e.target.value))}
            className="px-4 py-3 rounded-lg border border-card-border focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none bg-card-bg text-fg"
          >
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
            <option value={8000}>8 seconds</option>
            <option value={10000}>10 seconds</option>
          </select>

          <span className="text-accent-text">
            {currentIndex + 1} of {photos.length}
          </span>
        </div>
      )}

      {/* Slideshow */}
      <div
        ref={slideshowRef}
        className={`relative bg-black overflow-hidden shadow-2xl ${isFullscreen ? "w-screen h-screen" : "rounded-2xl"} ${
          isFullscreen && !showControls ? "cursor-none" : ""
        }`}
      >
        <div className={`relative ${isFullscreen ? "w-full h-full" : "aspect-video"}`}>
          {currentPhoto.url ? (
            <img src={currentPhoto.url} alt={currentPhoto.caption || "Wedding photo"} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-input-bg flex items-center justify-center">
              <span className="text-accent-text">Loading...</span>
            </div>
          )}

          {/* Navigation arrows */}
          <button
            onClick={prevPhoto}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/75 transition-all duration-300 ${
              isFullscreen && !showControls ? "opacity-0" : "opacity-100"
            }`}
          >
            ←
          </button>
          <button
            onClick={nextPhoto}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-black/75 transition-all duration-300 ${
              isFullscreen && !showControls ? "opacity-0" : "opacity-100"
            }`}
          >
            →
          </button>

          {/* Fullscreen overlay controls */}
          {isFullscreen && (
            <>
              <div
                className={`absolute top-4 right-4 flex gap-2 transition-opacity duration-300 ${
                  showControls ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  onClick={() => setIsPlaying(prev => !prev)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    isPlaying ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {isPlaying ? "⏸️" : "▶️"}
                </button>
                <button
                  onClick={exitFullscreen}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-all"
                >
                  ✕ Exit
                </button>
              </div>

              <div
                className={`absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg transition-opacity duration-300 ${
                  showControls ? "opacity-100" : "opacity-0"
                }`}
              >
                {currentIndex + 1} / {photos.length}
              </div>
            </>
          )}

          {/* Photo info overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6 transition-opacity duration-300 ${
              isFullscreen && !showControls ? "opacity-0" : "opacity-100"
            }`}
          >
            <h3 className="text-white font-bold text-lg mb-1">Photo by {currentPhoto.uploaderName}</h3>
            {currentPhoto.caption && <p className="text-white text-sm opacity-90 mb-2">{currentPhoto.caption}</p>}
            <p className="text-white text-xs opacity-75">{new Date(currentPhoto._creationTime).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      {!isFullscreen && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {photos.map((photo, index) => (
            <button
              key={photo._id}
              onClick={() => setCurrentIndex(index)}
              className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex ? "border-blue-500 ring-2 ring-blue-200" : "border-card-border hover:border-accent-text"
              }`}
            >
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      {!isFullscreen && (
        <div className="mt-4 text-center text-sm text-accent-text">
          <p>
            💡 Keyboard shortcuts:{" "}
            <kbd className="px-2 py-1 bg-input-bg rounded-sm border border-card-border text-fg">F</kbd> Fullscreen •{" "}
            <kbd className="px-2 py-1 bg-input-bg rounded-sm border border-card-border text-fg">Space</kbd> Play/Pause •{" "}
            <kbd className="px-2 py-1 bg-input-bg rounded-sm border border-card-border text-fg">←</kbd>{" "}
            <kbd className="px-2 py-1 bg-input-bg rounded-sm border border-card-border text-fg">→</kbd> Navigate
          </p>
        </div>
      )}
    </div>
  );
}
