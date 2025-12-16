import { usePaginatedQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { ImageCarousel } from "./components/ImageCarousel";

export function PhotoGallery() {
  const { results: posts, status, loadMore } = usePaginatedQuery(
    api.posts.getApprovedPostsPaginated, 
    {}, 
    { initialNumItems: 5 } // Start with 5 items
  );
  
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [initialSlideIndex, setInitialSlideIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === "CanLoadMore") {
          loadMore(5); // Load 5 more items
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [status, loadMore]);

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📷</div>
        <h3 className="text-2xl font-bold text-gray-700 mb-2">No photos yet</h3>
        <p className="text-gray-500">
          Be the first to share a beautiful wedding memory!
        </p>
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
        <h2>
          Wedding Photo Gallery
        </h2>
        <p>
          {posts.length} beautiful {posts.length === 1 ? 'memory' : 'memories'} shared by our loved ones
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
        {posts.map((post) => (
          <div
            key={post._id}
            className="bg-white rounded-xl shadow-lg border border-rose-50 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] dark:bg-black/90 dark:border-rose-800 dark:shadow-xs dark:bg-linear-to-br dark:from-bg-color-start dark:to-bg-color-end dark:hover:bg-black/90 dark:hover:border-rose-800 dark:hover:shadow-xs dark:hover:bg-linear-to-br dark:hover:from-bg-color-start dark:hover:to-bg-color-end dark:hover:text-white dark:hover:border-white"
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
                  <p className="font-semibold text-sm">
                    {post.uploaderName}
                  </p>
                  <p className="text-xs">
                    {new Date(post._creationTime).toLocaleDateString()}
                  </p>
                </div>
                {post.photoUrls.length > 1 && (
                  <span className="bg-gray-100 dark:bg-black/90 text-xs px-2 py-1 rounded-full">
                    {post.photoUrls.length} photos
                  </span>
                )}
              </div>
              {post.caption && (
                <p className="text-sm mt-3 leading-relaxed">
                  {post.caption}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Loading Sentinel */}
        <div ref={loadMoreRef} className="h-20 flex justify-center items-center">
            {status === "LoadingMore" ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-500"></div>
            ) : status === "Exhausted" ? (
                <span className="text-gray-400 text-sm">You've reached the end!</span>
            ) : null}
        </div>
      </div>

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
            
            <div className="mt-4 text-white">
              <h3 className="font-bold text-lg mb-1">
                {selectedPost.uploaderName}
              </h3>
              {selectedPost.caption && (
                <p className="text-gray-300 text-sm">{selectedPost.caption}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {new Date(selectedPost._creationTime).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
