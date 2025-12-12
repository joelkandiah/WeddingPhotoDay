import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { PhotoUpload } from "./PhotoUpload";
import { PhotoGallery } from "./PhotoGallery";
import { AdminPanel } from "./AdminPanel";
import { Slideshow } from "./Slideshow";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState<"gallery" | "upload" | "admin" | "slideshow">("gallery");
  const isAdmin = useQuery(api.photos.isUserAdmin);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-rose-50 to-pink-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-rose-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              💕 Our Wedding Memories
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Authenticated>
              <nav className="flex gap-2">
                <button
                  onClick={() => setCurrentView("gallery")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    currentView === "gallery"
                      ? "bg-rose-100 text-rose-700"
                      : "text-gray-600 hover:text-rose-600"
                  }`}
                >
                  Gallery
                </button>
                <button
                  onClick={() => setCurrentView("upload")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    currentView === "upload"
                      ? "bg-rose-100 text-rose-700"
                      : "text-gray-600 hover:text-rose-600"
                  }`}
                >
                  Upload
                </button>
                <button
                  onClick={() => setCurrentView("slideshow")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    currentView === "slideshow"
                      ? "bg-rose-100 text-rose-700"
                      : "text-gray-600 hover:text-rose-600"
                  }`}
                >
                  Slideshow
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setCurrentView("admin")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      currentView === "admin"
                        ? "bg-rose-100 text-rose-700"
                        : "text-gray-600 hover:text-rose-600"
                    }`}
                  >
                    Admin
                  </button>
                )}
              </nav>
            </Authenticated>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Content currentView={currentView} />
      </main>
      <Toaster />
    </div>
  );
}

function Content({ currentView }: { currentView: string }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = useQuery(api.photos.isUserAdmin);
  const makeMeAdmin = useMutation(api.photos.makeMeAdmin);

  const handleMakeMeAdmin = async () => {
    try {
      const result = await makeMeAdmin({});
      toast.success(result);
    } catch (error) {
      toast.error("Failed to grant admin access");
    }
  };

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Unauthenticated>
        <div className="text-center py-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-6">
            Share Our Wedding Joy
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Help us capture every beautiful moment by sharing your photos
          </p>
          <div className="max-w-md mx-auto">
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Welcome, {loggedInUser?.email?.split('@')[0] || "friend"}!
          </h1>
          <p className="text-gray-600">
            Thank you for being part of our special day 💕
          </p>
          
          {/* Admin setup helper */}
          {loggedInUser && !isAdmin && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-2">
                Need to approve photos? Click below to become an admin:
              </p>
              <button
                onClick={handleMakeMeAdmin}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Make Me Admin
              </button>
            </div>
          )}
        </div>

        {currentView === "gallery" && <PhotoGallery />}
        {currentView === "upload" && <PhotoUpload />}
        {currentView === "slideshow" && <Slideshow />}
        {currentView === "admin" && <AdminPanel />}
      </Authenticated>
    </div>
  );
}
