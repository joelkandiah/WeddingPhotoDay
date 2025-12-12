import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function PhotoUpload() {
  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.photos.generateUploadUrl);
  const uploadPhoto = useMutation(api.photos.uploadPhoto);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("Image must be smaller than 10MB");
        return;
      }
      setSelectedImage(file);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedImage || !uploaderName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Get upload URL
      const postUrl = await generateUploadUrl();

      // Step 2: Upload file
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage.type },
        body: selectedImage,
      });

      const json = await result.json();
      if (!result.ok) {
        throw new Error(`Upload failed: ${JSON.stringify(json)}`);
      }

      const { storageId } = json;

      // Step 3: Save to database
      await uploadPhoto({
        storageId,
        uploaderName: uploaderName.trim(),
        caption: caption.trim() || undefined,
      });

      toast.success("Photo uploaded successfully! It will appear after admin approval.");
      
      // Reset form
      setUploaderName("");
      setCaption("");
      setSelectedImage(null);
      if (imageInput.current) {
        imageInput.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-rose-100 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Share a Wedding Memory 📸
        </h2>
        
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all resize-none"
              placeholder="Share the story behind this moment..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Photo *
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                ref={imageInput}
                onChange={handleImageSelect}
                className="hidden"
                required
              />
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-rose-400 transition-colors text-center"
              >
                {selectedImage ? (
                  <div className="space-y-2">
                    <div className="text-green-600 font-medium">
                      ✓ {selectedImage.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Click to change photo
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-4xl">📷</div>
                    <div className="text-gray-600 font-medium">
                      Click to select a photo
                    </div>
                    <div className="text-sm text-gray-500">
                      JPG, PNG up to 10MB
                    </div>
                  </div>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUploading || !selectedImage || !uploaderName.trim()}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold py-4 rounded-lg hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uploading...
              </div>
            ) : (
              "Upload Photo 💕"
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-rose-50 rounded-lg">
          <p className="text-sm text-rose-700">
            <strong>Note:</strong> All photos will be reviewed before appearing in the gallery. 
            Thank you for helping us create beautiful memories! 🌹
          </p>
        </div>
      </div>
    </div>
  );
}
