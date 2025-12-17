import { useRef, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { POST_CATEGORIES, PostCategory } from "../../convex/constants";

interface CategoryTabsProps {
  selectedCategory: PostCategory | "All Posts";
  onSelectCategory: (category: PostCategory | "All Posts") => void;
  showCounter?: boolean;
}

export function CategoryTabs({ selectedCategory, onSelectCategory, showCounter = true }: CategoryTabsProps) {
  const totalPostsCount = useQuery(api.posts.getApprovedPostsCount);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [hiddenLeftArrow, setHiddenLeftArrow] = useState(true);
  const [hiddenRightArrow, setHiddenRightArrow] = useState(false);

  const checkScroll = () => {
    if (tabsContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsContainerRef.current;
      setHiddenLeftArrow(scrollLeft <= 5); // Slight buffer
      setHiddenRightArrow(scrollLeft >= scrollWidth - clientWidth - 5);
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

  return (
    <div className="mb-6">
      {showCounter && totalPostsCount !== undefined && (
        <div className="text-center mb-4">
          <p className="text-accent-text text-sm">
            <span className="font-bold text-fg">{totalPostsCount}</span> {totalPostsCount === 1 ? 'memory' : 'memories'} shared by our loved ones
          </p>
        </div>
      )}

      <div className="relative">
        {/* Left Arrow - visible on desktop only */}
        {!hiddenLeftArrow && (
          <button
            onClick={() => scrollTabs('left')}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 bg-card-bg/90 backdrop-blur-sm border border-card-border rounded-full w-8 h-8 items-center justify-center hover:bg-input-bg transition-colors shadow-md text-fg"
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
          <div className="flex gap-2 border-b border-card-border min-w-max px-4 md:px-0">
            <button
              onClick={() => onSelectCategory("All Posts")}
              className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                selectedCategory === "All Posts"
                  ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              All Posts
            </button>
            {POST_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  selectedCategory === cat
                    ? "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400"
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
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 bg-card-bg/90 backdrop-blur-sm border border-card-border rounded-full w-8 h-8 items-center justify-center hover:bg-input-bg transition-colors shadow-md text-fg"
            aria-label="Scroll right"
          >
            →
          </button>
        )}
      </div>
    </div>
  );
}
