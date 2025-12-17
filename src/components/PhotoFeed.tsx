import { usePaginatedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRef, useEffect } from "react";
import { ImageCarousel } from "./ImageCarousel";
import { PostCategory } from "../../convex/constants";

interface PhotoFeedProps {
  category: PostCategory | "All Posts";
  onPostClick: (post: any, index: number) => void;
}

export function PhotoFeed({ category, onPostClick }: PhotoFeedProps) {
  const { results: posts, status, loadMore } = usePaginatedQuery(
    api.posts.getApprovedPostsPaginated, 
    { 
      category: category === "All Posts" ? undefined : category
    }, 
    { initialNumItems: 5 } 
  );

  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📷</div>
        <h3 className="text-2xl font-bold text-fg mb-2">No photos yet</h3>
        <p className="text-accent-text">
          Be the first to share a beautiful wedding memory!
        </p>
      </div>
    );
  }

  return (
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
              onImageClick={(index) => onPostClick(post, index)}
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
  );
}
