import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import { ImageCarousel } from "./components/ImageCarousel";
import { usePaginatedQuery } from "convex/react";
import { POST_CATEGORIES, type PostCategory } from "../convex/constants";
import type { Id } from "../convex/_generated/dataModel";

type Post = {
  _id: Id<"posts">;
  uploaderName: string;
  caption?: string;
  category: PostCategory;
  photoUrls: Array<{ original: string; thumbnail: string; small: string; medium: string; large: string }>;
  _creationTime: number;
};

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState<PostCategory>(POST_CATEGORIES[0]);
  
  // Use paginated queries instead of loading all posts at once
  const { results: pendingPosts, status: pendingStatus, loadMore: loadMorePending } = usePaginatedQuery(
    api.posts.getPendingPostsPaginated,
    {},
    { initialNumItems: 10 }
  );
  const { results: approvedPosts, status: approvedStatus, loadMore: loadMoreApproved } = usePaginatedQuery(
    api.posts.getApprovedPostsForAdminPaginated,
    {},
    { initialNumItems: 10 }
  );
  const { results: rejectedPosts, status: rejectedStatus, loadMore: loadMoreRejected } = usePaginatedQuery(
    api.posts.getRejectedPostsForAdminPaginated,
    {},
    { initialNumItems: 10 }
  );

  // Get counts for tab labels
  const pendingCount = useQuery(api.posts.getPendingPostsCount);
  const approvedCount = useQuery(api.posts.getApprovedPostsCount);
  const rejectedCount = useQuery(api.posts.getRejectedPostsCount);
  
  const approvePost = useMutation(api.posts.approvePost);
  const rejectPost = useMutation(api.posts.rejectPost);
  const revokeApproval = useMutation(api.posts.revokePostApproval);
  const approveAllPending = useMutation(api.posts.approveAllPendingPosts);
  const deletePost = useMutation(api.posts.deletePost);
  const editPost = useMutation(api.posts.editPost);

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

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    setEditCaption(post.caption || "");
    setEditCategory(post.category);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;

    try {
      await editPost({
        postId: editingPost._id,
        caption: editCaption || undefined,
        category: editCategory,
      });
      toast.success("Post updated successfully!");
      setEditingPost(null);
    } catch (error) {
      toast.error("Failed to update post");
    }
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditCaption("");
    setEditCategory(POST_CATEGORIES[0]);
  };

  const handleApproveAll = async () => {
    if (!pendingPosts || pendingPosts.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to approve all ${pendingPosts.length} pending posts shown?`
    );
    
    if (!confirmed) return;

    try {
      const count = await approveAllPending({});
      toast.success(`${count} posts approved!`);
    } catch (error) {
      toast.error("Failed to approve all posts");
    }
  };

  if (pendingStatus === "LoadingFirstPage" || approvedStatus === "LoadingFirstPage" || rejectedStatus === "LoadingFirstPage") {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  const currentPosts = 
    activeTab === "pending" ? pendingPosts : 
    activeTab === "approved" ? approvedPosts : 
    rejectedPosts;

  const currentStatus = 
    activeTab === "pending" ? pendingStatus : 
    activeTab === "approved" ? approvedStatus : 
    rejectedStatus;

  const loadMore = 
    activeTab === "pending" ? loadMorePending : 
    activeTab === "approved" ? loadMoreApproved : 
    loadMoreRejected;

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
              ? "border-violet-500 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Pending ({pendingCount ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "approved"
              ? "border-violet-500 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Approved ({approvedCount ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("rejected")}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "rejected"
              ? "border-violet-500 text-violet-600 dark:border-violet-400 dark:text-violet-400"
              : "border-transparent text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          Rejected ({rejectedCount ?? 0})
        </button>
      </div>

      {/* Approve All Button - only show on pending tab */}
      {activeTab === "pending" && pendingCount && pendingCount > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleApproveAll}
            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors"
          >
            ✓ Approve All ({pendingCount})
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
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    Category: {post.category}
                  </p>
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
                      onClick={() => handleEdit(post)}
                      className="flex-1 bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      ✏️ Edit
                    </button>
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
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(post)}
                      className="flex-1 bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleRevokeApproval(post._id)}
                      className="flex-1 bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      ↶ Revoke Approval
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleEdit(post)}
                      className="flex-1 bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      ✏️ Edit
                    </button>
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

          {/* Load More Button */}
          {currentStatus === "CanLoadMore" && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => loadMore(10)}
                className="px-8 py-3 bg-violet-500 text-white font-semibold rounded-lg hover:bg-violet-600 transition-colors"
              >
                Load More Posts
              </button>
            </div>
          )}

          {currentStatus === "LoadingMore" && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card-bg rounded-2xl shadow-2xl border border-card-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">Edit Post</h2>
              
              <div className="mb-6">
                <div className="aspect-video overflow-hidden bg-input-bg rounded-lg mb-4">
                  <ImageCarousel 
                    images={editingPost.photoUrls} 
                    alt={editingPost.caption || "Wedding photo"}
                    className="w-full h-full"
                    aspectRatio="contain"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Uploaded by {editingPost.uploaderName} • {new Date(editingPost._creationTime).toLocaleString()}
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="edit-category" className="block text-sm font-semibold mb-2">
                  Category
                </label>
                <select
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as PostCategory)}
                  className="w-full px-4 py-3 rounded-lg border border-card-border bg-input-bg text-primary focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {POST_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label htmlFor="edit-caption" className="block text-sm font-semibold mb-2">
                  Caption
                </label>
                <textarea
                  id="edit-caption"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Add a caption..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-card-border bg-input-bg text-primary placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

