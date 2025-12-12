import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

export function PhotoGallery() {
  const photos = useQuery(api.photos.getApprovedPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  if (photos === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (photos.length === 0) {
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

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Wedding Photo Gallery
        </h2>
        <p className="text-gray-600">
          {photos.length} beautiful {photos.length === 1 ? 'memory' : 'memories'} shared by our loved ones
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {photos.map((photo) => (
          <div
            key={photo._id}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={() => setSelectedPhoto(photo)}
          >
            <div className="aspect-square overflow-hidden">
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={photo.caption || "Wedding photo"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Loading...</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <p className="font-semibold text-gray-800 text-sm">
                {photo.uploaderName}
              </p>
              {photo.caption && (
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                  {photo.caption}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(photo._creationTime).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-full bg-white rounded-2xl overflow-hidden">
            <div className="relative">
              {selectedPhoto.url ? (
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.caption || "Wedding photo"}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">Loading...</span>
                </div>
              )}
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-lg text-gray-800 mb-2">
                Photo by {selectedPhoto.uploaderName}
              </h3>
              {selectedPhoto.caption && (
                <p className="text-gray-600 mb-3">{selectedPhoto.caption}</p>
              )}
              <p className="text-sm text-gray-400">
                Shared on {new Date(selectedPhoto._creationTime).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
