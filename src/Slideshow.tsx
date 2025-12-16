import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect, useRef, useMemo } from "react";

export function Slideshow() {
  const posts = useQuery(api.posts.getApprovedPosts);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [interval, setIntervalDuration] = useState(5000); // 5 seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten posts into individual photos
  const photos = useMemo(() => {
    if (!posts) return [];
    return posts.flatMap(post => 
      post.photoUrls.map(url => ({
        _id: post._id + url, // unique key
        url,
        caption: post.caption,
        uploaderName: post.uploaderName,
        _creationTime: post._creationTime
      }))
    );
  }, [posts]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Mouse activity tracking for auto-hiding controls
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }

    const handleMouseMove = () => {
      setShowControls(true);
      
      // Clear existing timeout
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      
      // Set new timeout to hide controls after 3 seconds
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    // Initial timeout
    handleMouseMove();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isFullscreen]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        exitFullscreen();
      } else if (e.key === "ArrowLeft") {
        prevPhoto();
      } else if (e.key === "ArrowRight") {
        nextPhoto();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isPlaying, isFullscreen]);

  // Auto-advance slideshow
  useEffect(() => {
    if (!isPlaying || !photos || photos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, photos, interval]);

  const toggleFullscreen = async () => {
    if (!slideshowRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await slideshowRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  if (posts === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 dark:border-rose-400"></div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-2xl font-bold text-gray-700 mb-2">No photos for slideshow</h3>
        <p className="text-gray-500">
          Upload and approve some photos to start the slideshow!
        </p>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {!isFullscreen && (
        <div className="text-center mb-6">
          <h2>
            Wedding Slideshow 🎬
          </h2>
          
          {/* Controls */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                isPlaying
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
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
              value={interval}
              onChange={(e) => setIntervalDuration(Number(e.target.value))}
              className="px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-hidden bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={3000}>3 seconds</option>
              <option value={5000}>5 seconds</option>
              <option value={8000}>8 seconds</option>
              <option value={10000}>10 seconds</option>
            </select>
            
            <span className="text-gray-600">
              {currentIndex + 1} of {photos.length}
            </span>
          </div>
        </div>
      )}

      {/* Main slideshow area */}
      <div 
        ref={slideshowRef}
        className={`relative bg-black overflow-hidden shadow-2xl ${
          isFullscreen 
            ? "w-screen h-screen" 
            : "rounded-2xl"
        } ${isFullscreen && !showControls ? "cursor-none" : ""}`}
      >
        <div className={`relative ${isFullscreen ? "w-full h-full" : "aspect-video"}`}>
          {currentPhoto.url ? (
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || "Wedding photo"}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">Loading...</span>
            </div>
          )}
          
          {/* Navigation arrows */}
          <button
            onClick={prevPhoto}
            className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all duration-300 ${
              isFullscreen && !showControls ? "opacity-0" : "opacity-100"
            }`}
          >
            ←
          </button>
          <button
            onClick={nextPhoto}
            className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-75 transition-all duration-300 ${
              isFullscreen && !showControls ? "opacity-0" : "opacity-100"
            }`}
          >
            →
          </button>

          {/* Fullscreen controls overlay */}
          {isFullscreen && (
            <div className={`absolute top-4 right-4 flex gap-2 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  isPlaying
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
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
          )}

          {/* Photo counter in fullscreen */}
          {isFullscreen && (
            <div className={`absolute top-4 left-4 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0"
            }`}>
              {currentIndex + 1} / {photos.length}
            </div>
          )}
          
          {/* Photo info overlay */}
          <div className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black to-transparent p-6 transition-opacity duration-300 ${
            isFullscreen && !showControls ? "opacity-0" : "opacity-100"
          }`}>
            <h3 className="text-white font-bold text-lg mb-1">
              Photo by {currentPhoto.uploaderName}
            </h3>
            {currentPhoto.caption && (
              <p className="text-white text-sm opacity-90 mb-2">
                {currentPhoto.caption}
              </p>
            )}
            <p className="text-white text-xs opacity-75">
              {new Date(currentPhoto._creationTime).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Thumbnail navigation - hidden in fullscreen */}
      {!isFullscreen && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-4">
          {photos.map((photo, index) => (
            <button
              key={photo._id}
              onClick={() => setCurrentIndex(index)}
              className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? "border-rose-500 ring-2 ring-rose-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-xs text-gray-500">...</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {!isFullscreen && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>💡 Keyboard shortcuts: <kbd className="px-2 py-1 bg-gray-100 rounded-sm dark:bg-gray-700 dark:text-gray-300">F</kbd> Fullscreen • <kbd className="px-2 py-1 bg-gray-100 rounded-sm dark:bg-gray-700 dark:text-gray-300">Space</kbd> Play/Pause • <kbd className="px-2 py-1 bg-gray-100 rounded-sm dark:bg-gray-700 dark:text-gray-300">←</kbd> <kbd className="px-2 py-1 bg-gray-100 rounded-sm dark:bg-gray-700 dark:text-gray-300">→</kbd> Navigate</p>
        </div>
      )}
    </div>
  );
}
