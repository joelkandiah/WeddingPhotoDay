import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export function SettingsPage() {
  const user = useQuery(api.auth.loggedInUser);
  const updateName = useMutation(api.userSettings.updateName);
  const updatePassword = useMutation(api.userSettings.updatePassword);
  const deleteAccount = useMutation(api.userSettings.deleteAccount);

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingName(true);
    try {
      await updateName({ name });
      toast.success("Name updated successfully! ✨");
    } catch (error: any) {
      toast.error(error.message || "Failed to update name");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      toast.success("Password updated successfully! 🔐");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ DANGER ZONE: Are you sure you want to delete your account?\n\n" +
      "This will PERMANENTLY delete:\n" +
      "- Your account and login information\n" +
      "- ALL photos you have shared\n" +
      "- ALL your posts in the gallery\n\n" +
      "This action cannot be undone."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success("Account deleted. We're sorry to see you go!");
      // The session will be invalidated on the server, reload to clear state
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12 animate-fade-in">
      {/* Profile Section */}
      <section className="card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">👤</span>
          <h2 className="text-xl font-bold text-card-text">Profile Settings</h2>
        </div>
        
        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-text mb-2">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-card-text"
              placeholder="Your name"
              required
              minLength={2}
            />
          </div>
          <button
            type="submit"
            disabled={isUpdatingName || name === user.name}
            className="btn-primary px-6 py-2"
          >
            {isUpdatingName ? "Saving..." : "Update Name"}
          </button>
        </form>
      </section>

      {/* Password Section */}
      <section className="card p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔐</span>
          <h2 className="text-xl font-bold text-card-text">Change Password</h2>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-text mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-field text-card-text"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-text mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field text-card-text"
                placeholder="Min 8 characters"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-text mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field text-card-text"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isUpdatingPassword || !currentPassword || !newPassword}
            className="btn-primary px-6 py-2"
          >
            {isUpdatingPassword ? "Updating..." : "Change Password"}
          </button>
        </form>
      </section>

      {/* Danger Zone */}
      <section className="rounded-2xl shadow-md p-6 md:p-8" style={{backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)'}}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400/80 mb-6">
          Deleting your account is permanent and cannot be undone. All your data, including shared photos and posts, will be removed from our systems.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="bg-white dark:bg-transparent font-bold px-6 py-2 rounded-xl transition-all disabled:opacity-50" style={{border: '2px solid rgb(239, 68, 68)', color: 'rgb(220, 38, 38)'}}
          onMouseEnter={(e) => {e.currentTarget.style.backgroundColor = 'rgb(239, 68, 68)'; e.currentTarget.style.color = 'white';}}
          onMouseLeave={(e) => {e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.color = 'rgb(220, 38, 38)';}}
        >
          {isDeleting ? "Deleting Account..." : "Delete Account"}
        </button>
      </section>
    </div>
  );
}
