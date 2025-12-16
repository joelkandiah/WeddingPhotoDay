import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { ImageCarousel } from "./components/ImageCarousel";
import { POST_CATEGORIES, PostCategory } from "../convex/constants";

export function PhotoGallery() {
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | "All Posts">("All Posts");
  const { results: posts, status, loadMore } = usePaginatedQuery(
    api.posts.getApprovedPostsPaginated, 
    { 
      category: selectedCategory === "All Posts" ? undefined : selectedCategory
    }, 
    { initialNumItems: 5 } 
  );
  
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [initialSlideIndex, setInitialSlideIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [hiddenLeftArrow, setHiddenLeftArrow] = useState(true);
  const [hiddenRightArrow, setHiddenRightArrow] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "CanLoadMore") {
          loadMore(5);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [status, loadMore]);

  // Check scroll position to show/hide arrows
  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setHiddenLeftArrow(scrollLeft == 0);
      setHiddenRightArrow(scrollLeft == scrollWidth - clientWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const scrollAmount = 200;
      tabsContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 dark:border-rose-400"></div>
      </div>
    );
  }

  const handlePostClick = (post: any, index: number) => {
    setSelectedPost(post);
    setInitialSlideIndex(index);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2>Wedding Photo Gallery</h2>
        <p>
          {posts.length} {posts.length === 1 ? 'memory' : 'memories'} shared by our loved ones
        </p>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 relative">
        {/* Left Arrow - visible on desktop only */}
        {!hiddenLeftArrow && (
          <button
            onClick={() => scrollTabs('left')}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card-bg/90 backdrop-blur-sm border border-card-border rounded-full w-8 h-8 items-center justify-center hover:bg-input-bg transition-colors shadow-md"
            aria-label="Scroll left"
          >
            ←
          </button>
        )}

        {/* Tabs Container */}
        <div 
          ref={tabsContainerRef}
          onScroll={checkScroll}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-2 border-b border-card-border min-w-max px-10 md:px-0">
            <button
              onClick={() => setSelectedCategory("All Posts")}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                selectedCategory === "All Posts"
                  ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400"
                  : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              All Posts
            </button>
            {POST_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  selectedCategory === cat
                    ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400"
                    : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Right Arrow - visible on desktop only */}
        {!hiddenRightArrow && (
          <button
            onClick={() => scrollTabs('right')}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card-bg/90 backdrop-blur-sm border border-card-border rounded-full w-8 h-8 items-center justify-center hover:bg-input-bg transition-colors shadow-md"
            aria-label="Scroll right"
          >
            →
          </button>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-2xl font-bold text-fg mb-2">No photos yet</h3>
          <p className="text-accent-text">
            Be the first to share a beautiful wedding memory!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {posts.map((post) => (
            <div
              key={post._id}
              className="bg-card-bg rounded-xl shadow-lg border border-card-border overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]"
            >
              <div className="overflow-hidden">
                <ImageCarousel 
                  images={post.photoUrls} 
                  alt={post.caption || "Wedding photo"}
                  onImageClick={(index) => handlePostClick(post, index)}
                  className="w-full h-auto"
                  aspectRatio="auto"
                />
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm text-fg">{post.uploaderName}</p>
                    <p className="text-xs text-accent-text">
                      {new Date(post._creationTime).toLocaleDateString()}
                    </p>
                  </div>
                  {post.photoUrls.length > 1 && (
                    <span className="bg-input-bg text-xs px-2 py-1 rounded-full text-accent-text">
                      {post.photoUrls.length} photos
                    </span>
                  )}
                </div>
                {post.caption && <p className="text-sm mt-3 leading-relaxed">{post.caption}</p>}
              </div>
            </div>
          ))}

          {/* Loading Sentinel */}
          <div ref={loadMoreRef} className="h-20 flex justify-center items-center">
            {status === "LoadingMore" ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-card-border"></div>
            ) : status === "Exhausted" ? (
              <span className="text-accent-text text-sm">You've reached the end!</span>
            ) : null}
          </div>
        </div>
      )}

      {/* Post Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="w-full max-w-5xl h-full flex flex-col justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex-1 min-h-0 bg-black flex items-center justify-center rounded-lg overflow-hidden">
              <ImageCarousel 
                images={selectedPost.photoUrls} 
                alt={selectedPost.caption || "Wedding photo"}
                className="w-full h-full"
                aspectRatio="contain"
              />
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all z-20"
              >
                ✕
              </button>
            </div>
            
            <div className="mt-4 text-fg">
              <h3 className="font-bold text-lg mb-1">{selectedPost.uploaderName}</h3>
              {selectedPost.caption && <p className="text-accent-text text-sm">{selectedPost.caption}</p>}
              <p className="text-xs text-accent-text mt-1">
                {new Date(selectedPost._creationTime).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
