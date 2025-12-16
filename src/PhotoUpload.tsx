import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function PhotoUpload() {
  const [uploaderName, setUploaderName] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, boolean>>({});
  const imageInput = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const uploadPost = useMutation(api.posts.uploadPost);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file sizes
    const validFiles = files.filter(file => {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 15MB)`);
        return false;
      }
      return true;
    });

    setSelectedImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (selectedImages.length === 0 || !uploaderName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    try {
      // Upload all photos
      const storageIds: string[] = [];
      
      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        
        // Get upload URL
        const postUrl = await generateUploadUrl();

        // Upload file
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        const json = await result.json();
        if (!result.ok) {
          throw new Error(`Upload failed for ${file.name}: ${JSON.stringify(json)}`);
        }

        storageIds.push(json.storageId);
        
        // Update progress
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: true
        }));
      }

      // Create post with all photos
      await uploadPost({
        photoStorageIds: storageIds as any,
        uploaderName: uploaderName.trim(),
        caption: caption.trim() || undefined,
      });

      toast.success(`${selectedImages.length} photo${selectedImages.length > 1 ? 's' : ''} uploaded successfully! They will appear after admin approval.`);
      
      // Reset form
      setUploaderName("");
      setCaption("");
      setSelectedImages([]);
      setUploadProgress({});
      if (imageInput.current) {
        imageInput.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photos. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-black/40 rounded-2xl shadow-lg border border-rose-100 p-8 dark:border-rose-800">
        <h2 className="text-center">
          Share Wedding Memories 📸
        </h2>
        
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Your Name *
            </label>
            <input
              type="text"
              value={uploaderName}
              onChange={(e) => setUploaderName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-hidden transition-all dark:border-rose-800 dark:focus:border-rose-600 dark:focus:ring-rose-600"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Photo Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-hidden transition-all resize-none dark:border-rose-800 dark:focus:border-rose-600 dark:focus:ring-rose-600"
              placeholder="Share the story behind these moments..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Select Photos * {selectedImages.length > 0 && `(${selectedImages.length} selected)`}
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                multiple
                ref={imageInput}
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-rose-400 transition-colors text-center dark:border-rose-800 dark:hover:border-rose-600"
              >
                <div className="space-y-2">
                  <div className="text-4xl">📷</div>
                  <div className="text-gray-600 font-medium dark:text-gray-200">
                    Click to select photos
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    JPG, PNG up to 10MB each • Multiple photos allowed
                  </div>
                </div>
              </button>
            </div>

            {/* Photo Previews */}
            {selectedImages.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedImages.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                    {isUploading && uploadProgress[file.name] && (
                      <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <span className="text-green-700 font-bold">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isUploading || selectedImages.length === 0 || !uploaderName.trim()}
            className="w-full bg-linear-to-r from-rose-500 to-pink-500 text-white font-semibold py-4 rounded-lg hover:from-rose-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uploading {Object.keys(uploadProgress).length}/{selectedImages.length}...
              </div>
            ) : (
              `Upload ${selectedImages.length} Photo${selectedImages.length !== 1 ? 's' : ''} 💕`
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-rose-50 rounded-lg dark:bg-rose-800">
          <p className="text-sm text-rose-700 dark:text-gray-200">
            <strong>Note:</strong> All photos will be reviewed before appearing in the gallery. 
            Thank you for helping us create beautiful memories! 🌹
          </p>
        </div>
      </div>
    </div>
  );
}
