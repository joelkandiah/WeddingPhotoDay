import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

export function AdminPanel() {
  const pendingPhotos = useQuery(api.photos.getPendingPhotos);
  const approvePhoto = useMutation(api.photos.approvePhoto);
  const rejectPhoto = useMutation(api.photos.rejectPhoto);

  const handleApprove = async (photoId: string) => {
    try {
      await approvePhoto({ photoId: photoId as any });
      toast.success("Photo approved!");
    } catch (error) {
      toast.error("Failed to approve photo");
    }
  };

  const handleReject = async (photoId: string) => {
    try {
      await rejectPhoto({ photoId: photoId as any });
      toast.success("Photo rejected");
    } catch (error) {
      toast.error("Failed to reject photo");
    }
  };

  if (pendingPhotos === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Admin Panel
        </h2>
        <p className="text-gray-600">
          {pendingPhotos.length} {pendingPhotos.length === 1 ? 'photo' : 'photos'} awaiting approval
        </p>
      </div>

      {pendingPhotos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">All caught up!</h3>
          <p className="text-gray-500">
            No photos pending approval at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {pendingPhotos.map((photo) => (
            <div
              key={photo._id}
              className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden"
            >
              <div className="aspect-video overflow-hidden">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption || "Pending photo"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">Loading...</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">
                    Uploaded by {photo.uploaderName}
                  </h3>
                  {photo.uploaderEmail && (
                    <p className="text-sm text-gray-500 mb-2">
                      {photo.uploaderEmail}
                    </p>
                  )}
                  {photo.caption && (
                    <p className="text-gray-600 mb-3">{photo.caption}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    Uploaded {new Date(photo._creationTime).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(photo._id)}
                    className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleReject(photo._id)}
                    className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
