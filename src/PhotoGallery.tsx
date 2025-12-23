import { useState } from "react";
import { ImageCarousel } from "./components/ImageCarousel";
import { PostCategory } from "../convex/constants";
import { PhotoFeed } from "./components/PhotoFeed";
import { CategoryTabs } from "./components/CategoryTabs";
import { ElegantDivider } from "./components/ElegantDivider";

export function PhotoGallery() {
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | "All Posts">("All Posts");
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [initialSlideIndex, setInitialSlideIndex] = useState(0);

  const handlePostClick = (post: any, index: number) => {
    setSelectedPost(post);
    setInitialSlideIndex(index);
  };

  return (
    <div>
      <div className="text-center mb-8">
        <h2>Wedding Photo Gallery</h2>
      </div>

      <CategoryTabs 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory} 
      />

      <PhotoFeed 
        category={selectedCategory} 
        onPostClick={handlePostClick} 
      />

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
                initialSlide={initialSlideIndex}
              />
              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all z-20"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 bg-card-bg/95 backdrop-blur-sm rounded-b-lg text-fg border-0">
              <ElegantDivider className="mb-3" />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg mb-1">{selectedPost.uploaderName}</h3>
                  {selectedPost.caption && <p className="text-accent-text text-sm mb-2 leading-relaxed">{selectedPost.caption}</p>}
                  <p className="text-xs text-accent-text">
                    {new Date(selectedPost._creationTime).toLocaleDateString()}
                  </p>
                </div>
                {selectedPost.photoUrls.length > 1 && (
                  <span className="bg-input-bg text-xs px-2 py-1 rounded-full text-accent-text">
                    {selectedPost.photoUrls.length} photos
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
