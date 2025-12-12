import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const pendingPhotos = useQuery(api.photos.getPendingPhotos);
  const approvedPhotos = useQuery(api.photos.getApprovedPhotosForAdmin);
  const rejectedPhotos = useQuery(api.photos.getRejectedPhotosForAdmin);
  const approvePhoto = useMutation(api.photos.approvePhoto);
  const rejectPhoto = useMutation(api.photos.rejectPhoto);
  const revokeApproval = useMutation(api.photos.revokeApproval);
  const approveAllPending = useMutation(api.photos.approveAllPending);
  const deletePhoto = useMutation(api.photos.deletePhoto);

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

  const handleRevokeApproval = async (photoId: string) => {
    try {
      await revokeApproval({ photoId: photoId as any });
      toast.success("Approval revoked - photo moved to pending");
    } catch (error) {
      toast.error("Failed to revoke approval");
    }
  };

  const handleDelete = async (photoId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this photo? This action cannot be undone."
    );
    
    if (!confirmed) return;

    try {
      await deletePhoto({ photoId: photoId as any });
      toast.success("Photo permanently deleted");
    } catch (error) {
      toast.error("Failed to delete photo");
    }
  };

  const handleApproveAll = async () => {
    if (!pendingPhotos || pendingPhotos.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to approve all ${pendingPhotos.length} pending photos?`
    );
    
    if (!confirmed) return;

    try {
      const count = await approveAllPending({});
      toast.success(`${count} photos approved!`);
    } catch (error) {
      toast.error("Failed to approve all photos");
    }
  };

  if (pendingPhotos === undefined || approvedPhotos === undefined || rejectedPhotos === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  const currentPhotos = 
    activeTab === "pending" ? pendingPhotos : 
    activeTab === "approved" ? approvedPhotos : 
    rejectedPhotos;

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Admin Panel
        </h2>
        <p className="text-gray-600">
          Manage photo approvals and moderation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "pending"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Pending ({pendingPhotos.length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "approved"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Approved ({approvedPhotos.length})
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "rejected"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-gray-600 hover:text-gray-800"
          }`}
        >
          Rejected ({rejectedPhotos.length})
        </button>
      </div>

      {/* Approve All Button - only show on pending tab */}
      {activeTab === "pending" && pendingPhotos.length > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleApproveAll}
            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
          >
            ✓ Approve All ({pendingPhotos.length})
          </button>
        </div>
      )}

      {currentPhotos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">
            {activeTab === "pending" ? "✅" : activeTab === "approved" ? "📷" : "🚫"}
          </div>
          <h3 className="text-2xl font-bold text-gray-700 mb-2">
            {activeTab === "pending" 
              ? "All caught up!" 
              : activeTab === "approved" 
              ? "No approved photos" 
              : "No rejected photos"}
          </h3>
          <p className="text-gray-500">
            {activeTab === "pending"
              ? "No photos pending approval at the moment."
              : activeTab === "approved"
              ? "No photos have been approved yet."
              : "No photos have been rejected."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 max-w-3xl mx-auto">
          {currentPhotos.map((photo) => (
            <div
              key={photo._id}
              className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden"
            >
              <div className="aspect-video overflow-hidden">
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={photo.caption || "Photo"}
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
                
                {activeTab === "pending" ? (
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
                ) : activeTab === "approved" ? (
                  <button
                    onClick={() => handleRevokeApproval(photo._id)}
                    className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    ↶ Revoke Approval
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(photo._id)}
                      className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✓ Re-approve
                    </button>
                    <button
                      onClick={() => handleDelete(photo._id)}
                      className="flex-1 bg-red-600 text-white font-semibold py-3 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

