import { useRef, useCallback, useMemo, memo } from "react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { POST_CATEGORIES, PostCategory } from "../convex/constants";
import { useSignal, useComputed, useSignals } from "@preact/signals-react/runtime";

export function PhotoUpload() {
  useSignals(); // Make this component reactive to signal changes
  
  const imageInput = useRef<HTMLInputElement>(null);

  // Using signals for reactive state management - component re-renders when signals change
  const caption = useSignal("");
  const category = useSignal<PostCategory>("US Ceremony");
  const selectedImages = useSignal<File[]>([]);
  const isUploading = useSignal(false);
  const uploadProgress = useSignal<Record<string, boolean>>({});

  // Computed signal for upload button state
  const canUpload = useComputed(() => !isUploading.value && selectedImages.value.length > 0);
  const uploadButtonText = useComputed(() => {
    if (isUploading.value) {
      const uploaded = Object.keys(uploadProgress.value).length;
      const total = selectedImages.value.length;
      return `Uploading ${uploaded}/${total}...`;
    }
    const count = selectedImages.value.length;
    return `Upload ${count} Photo${count !== 1 ? 's' : ''} 💙`;
  });

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const uploadPost = useMutation(api.posts.uploadPost);

  // Use useCallback to prevent unnecessary re-creations
  const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file sizes
    const validFiles = files.filter(file => {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 15MB)`);
        return false;
      }
      return true;
    });

    selectedImages.value = [...selectedImages.value, ...validFiles];
  }, []);

  const removeImage = useCallback((index: number) => {
    selectedImages.value = selectedImages.value.filter((_, i) => i !== index);
  }, []);

  const handleUpload = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (selectedImages.value.length === 0) {
      toast.error("Please select at least one photo");
      return;
    }

    isUploading.value = true;
    uploadProgress.value = {};

    try {
      const storageIds: string[] = [];

      for (const file of selectedImages.value) {
        // Generate signed URL from Convex
        const { url, key } = await generateUploadUrl();

        // Upload file to R2
        const res = await fetch(url, {
          method: "PUT",
          body: file,
        });

        if (!res.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        // Store R2 object key for Convex post
        storageIds.push(key);

        // Update progress immediately after each file
        uploadProgress.value = { ...uploadProgress.value, [file.name]: true };
      }

      // Call mutation once with all keys
      await uploadPost({
        photoStorageIds: storageIds,
        caption: caption.value.trim() || undefined,
        category: category.value,
      });

      toast.success(`${selectedImages.value.length} photo${selectedImages.value.length > 1 ? "s" : ""} uploaded successfully! They will appear after admin approval.`);

      // Reset form
      caption.value = "";
      category.value = "US Ceremony";
      selectedImages.value = [];
      uploadProgress.value = {};
      if (imageInput.current) imageInput.current.value = "";

    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photos. Please try again.");
    } finally {
      isUploading.value = false;
    }
  }, [generateUploadUrl, uploadPost]);

  // Memoize the preview grid to avoid re-rendering on every signal change
  const imagePreviewGrid = useMemo(() => {
    if (selectedImages.value.length === 0) return null;
    
    return (
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {selectedImages.value.map((file, index) => (
          <ImagePreview
            key={`${file.name}-${index}`}
            file={file}
            index={index}
            isUploading={isUploading.value}
            isUploaded={uploadProgress.value[file.name]}
            onRemove={removeImage}
          />
        ))}
      </div>
    );
  }, [selectedImages.value, isUploading.value, uploadProgress.value, removeImage]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card-bg rounded-2xl shadow-lg border border-card-border p-8">
        <h2 className="text-center">
          Share Wedding Memories 📸
        </h2>
        
        <form onSubmit={handleUpload} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-card-text mb-2">
              Category *
            </label>
            <select
              value={category.value}
              onChange={(e) => category.value = e.target.value as PostCategory}
              className="bg-input-bg w-full px-4 py-3 rounded-lg border border-input-border focus:border-card-border focus:ring-2 focus:ring-card-border outline-hidden transition-all"
              required
            >
              {POST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-text mb-2">
              Photo Caption
            </label>
            <textarea
              value={caption.value}
              onChange={(e) => caption.value = e.target.value}
              className="bg-input-bg w-full px-4 py-3 rounded-lg border border-input-border focus:border-card-border focus:ring-2 focus:ring-card-border outline-hidden transition-all"
              placeholder="Share the story behind these moments..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-text mb-2">
              Select Photos * {selectedImages.value.length > 0 && `(${selectedImages.value.length} selected)`}
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
                className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-card-border transition-colors text-center dark:border-gray-600 dark:hover:border-card-border"
              >
                <div className="space-y-2">
                  <div className="text-4xl">📷</div>
                  <div className="text-gray-600 font-medium dark:text-gray-200">
                    Click to select photos
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    JPG, PNG, HEIC up to 10MB each • Multiple photos allowed
                  </div>
                </div>
              </button>
            </div>

            {/* Photo Previews using memoized grid */}
            {imagePreviewGrid}
          </div>

          <button
            type="submit"
            disabled={!canUpload.value}
            className={`w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-semibold py-4 rounded-lg hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl ${
              canUpload.value ? "pulse-playful" : ""
            }`}
          >
            {isUploading.value ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {uploadButtonText.value}
              </div>
            ) : (
              uploadButtonText.value
            )}
          </button>
        </form>

        <div className="mt-6 p-4 bg-card-bg rounded-lg dark:bg-card-bg/30 dark:border dark:border-card-border">
          <p className="text-sm text-card-text dark:text-card-text">
            <strong>Note:</strong> All photos will be reviewed before appearing in the gallery. 
            Thank you for helping us create beautiful memories! 📸
          </p>
        </div>
      </div>
    </div>
  );
}

// Memoized component for individual image preview to prevent unnecessary re-renders
interface ImagePreviewProps {
  file: File;
  index: number;
  isUploading: boolean;
  isUploaded?: boolean;
  onRemove: (index: number) => void;
}

const ImagePreview = memo(function ImagePreview({ file, index, isUploading, isUploaded, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative group">
      <img
        src={URL.createObjectURL(file)}
        alt={`Preview ${index + 1}`}
        className="w-full h-32 object-cover rounded-lg"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
      {isUploading && isUploaded && (
        <div className="absolute inset-0 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
          <span className="text-green-700 font-bold">✓</span>
        </div>
      )}
    </div>
  );
});
