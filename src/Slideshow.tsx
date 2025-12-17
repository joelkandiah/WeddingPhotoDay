import { useState } from "react";
import { PostCategory } from "../convex/constants";
import { CategoryTabs } from "./components/CategoryTabs";
import { SlideshowContent } from "./components/SlideshowContent";

export function Slideshow() {
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | "All Posts">("All Posts");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6">
        <h2>Wedding Slideshow 🎬</h2>
      </div>

      <CategoryTabs 
        selectedCategory={selectedCategory} 
        onSelectCategory={setSelectedCategory}
        showCounter={false}
      />

      <SlideshowContent category={selectedCategory} />
    </div>
  );
}
