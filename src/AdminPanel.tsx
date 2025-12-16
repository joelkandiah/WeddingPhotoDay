import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import { ImageCarousel } from "./components/ImageCarousel";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  
  // Use posts API instead of photos API
  const pendingPosts = useQuery(api.posts.getPendingPosts);
  const approvedPosts = useQuery(api.posts.getApprovedPostsForAdmin);
  const rejectedPosts = useQuery(api.posts.getRejectedPostsForAdmin);
  
  const approvePost = useMutation(api.posts.approvePost);
  const rejectPost = useMutation(api.posts.rejectPost);
  const revokeApproval = useMutation(api.posts.revokePostApproval);
  const approveAllPending = useMutation(api.posts.approveAllPendingPosts);
  const deletePost = useMutation(api.posts.deletePost);

  const handleApprove = async (postId: string) => {
    try {
      await approvePost({ postId: postId as any });
      toast.success("Post approved!");
    } catch (error) {
      toast.error("Failed to approve post");
    }
  };

  const handleReject = async (postId: string) => {
    try {
      await rejectPost({ postId: postId as any });
      toast.success("Post rejected");
    } catch (error) {
      toast.error("Failed to reject post");
    }
  };

  const handleRevokeApproval = async (postId: string) => {
    try {
      await revokeApproval({ postId: postId as any });
      toast.success("Approval revoked - post moved to pending");
    } catch (error) {
      toast.error("Failed to revoke approval");
    }
  };

  const handleDelete = async (postId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this post? This action cannot be undone."
    );
    
    if (!confirmed) return;

    try {
      await deletePost({ postId: postId as any });
      toast.success("Post permanently deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const handleApproveAll = async () => {
    if (!pendingPosts || pendingPosts.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to approve all ${pendingPosts.length} pending posts?`
    );
    
    if (!confirmed) return;

    try {
      const count = await approveAllPending({});
      toast.success(`${count} posts approved!`);
    } catch (error) {
      toast.error("Failed to approve all posts");
    }
  };

  if (pendingPosts === undefined || approvedPosts === undefined || rejectedPosts === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-card-border"></div>
      </div>
    );
  }

  const currentPosts = 
    activeTab === "pending" ? pendingPosts : 
    activeTab === "approved" ? approvedPosts : 
    rejectedPosts;

  return (
    <div>
      <div className="text-center mb-8">
        <h2>
          Admin Panel
        </h2>
        <p>
          Manage post approvals and moderation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-card-border">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "pending"
              ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400"
              : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Pending ({pendingPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "approved"
              ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400"
              : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Approved ({approvedPosts.length})
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "rejected"
              ? "border-rose-500 text-rose-600 dark:border-rose-400 dark:text-rose-400"
              : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Rejected ({rejectedPosts.length})
        </button>
      </div>

      {/* Approve All Button - only show on pending tab */}
      {activeTab === "pending" && pendingPosts.length > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleApproveAll}
            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
          >
            ✓ Approve All ({pendingPosts.length})
          </button>
        </div>
      )}

      {currentPosts.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">
            {activeTab === "pending" ? "✅" : activeTab === "approved" ? "📷" : "🚫"}
          </div>
          <h3>
            {activeTab === "pending" 
              ? "All caught up!" 
              : activeTab === "approved" 
              ? "No approved posts" 
              : "No rejected posts"}
          </h3>
          <p>
            {activeTab === "pending"
              ? "No posts pending approval at the moment."
              : activeTab === "approved"
              ? "No posts have been approved yet."
              : "No posts have been rejected."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 max-w-3xl mx-auto">
          {currentPosts.map((post) => (
            <div
              key={post._id}
              className="bg-card-bg rounded-2xl shadow-lg border border-card-border overflow-hidden"
            >
              <div className="aspect-video overflow-hidden bg-input-bg">
                <ImageCarousel 
                  images={post.photoUrls} 
                  alt={post.caption || "Wedding photo"}
                  className="w-full h-full"
                  aspectRatio="contain"
                />
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <h3>
                    Uploaded by {post.uploaderName}
                  </h3>
                  {post.uploaderName && (
                    <p className="text-sm mb-2">
                      {post.uploaderName}
                    </p>
                  )}
                  {post.caption && (
                    <p className="mb-3">{post.caption}</p>
                  )}
                  <p className="text-sm">
                    {post.photoUrls.length} photo{post.photoUrls.length !== 1 ? 's' : ''} • Uploaded {new Date(post._creationTime).toLocaleString()}
                  </p>
                </div>
                
                {activeTab === "pending" ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(post._id)}
                      className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(post._id)}
                      className="flex-1 bg-red-500 text-white font-semibold py-3 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                ) : activeTab === "approved" ? (
                  <button
                    onClick={() => handleRevokeApproval(post._id)}
                    className="w-full bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    ↶ Revoke Approval
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(post._id)}
                      className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      ✓ Re-approve
                    </button>
                    <button
                      onClick={() => handleDelete(post._id)}
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

