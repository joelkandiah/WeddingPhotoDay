import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { PhotoUpload } from "./PhotoUpload";
import { PhotoGallery } from "./PhotoGallery";
import { AdminPanel } from "./AdminPanel";
import { Slideshow } from "./Slideshow";
import { ThemeToggle } from "./components/ThemeToggle";
import { useState } from "react";

export default function App() {
  const [currentView, setCurrentView] = useState<"gallery" | "upload" | "admin" | "slideshow">("gallery");
  const isAdmin = useQuery(api.photos.isUserAdmin);

  const navItems = [
    { id: "gallery" as const, label: "Gallery", icon: "🖼️" },
    { id: "upload" as const, label: "Upload", icon: "📤" },
    { id: "slideshow" as const, label: "Slideshow", icon: "▶️" },
  ];

  // Add admin to nav items if user is admin
  const allNavItems = isAdmin 
    ? [...navItems, { id: "admin" as const, label: "Admin", icon: "⚙️" }]
    : navItems;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[var(--color-bg-start)] to-[var(--color-bg-end)]">
      <header className="sticky top-0 z-10 bg-card-bg/90 backdrop-blur-xs border-b border-card-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent dark:from-rose-400 dark:to-pink-400">
              💕 Our Wedding Memories
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <Authenticated>
              {/* Desktop Navigation - Hidden on mobile */}
              <nav className="hidden md:flex gap-2">
                {allNavItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      currentView === item.id
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-100"
                        : "text-gray-600 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </Authenticated>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 mobile-nav-spacing">
        <Content currentView={currentView} />
      </main>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <Authenticated>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-card-bg/90 backdrop-blur-xs border-t border-card-border shadow-lg pb-safe  dark:border-card-border">
          <div className={`grid gap-1 px-2 py-2 ${
            allNavItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
          }`}>
            {allNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`touch-target flex flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                  currentView === item.id
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-100"
                    : "text-gray-600 hover:text-rose-600 dark:text-gray-300 dark:hover:text-rose-400"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </Authenticated>

      <Toaster />
    </div>
  );
}

function Content({ currentView }: { currentView: string }) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = useQuery(api.photos.isUserAdmin);

  // Show loading while checking authentication state
  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 dark:border-rose-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Unauthenticated>
        <div className="text-center py-12">
          <h1>
            Share Our Wedding Joy
          </h1>
          <p className="text-xl mb-8">
            Help us capture every beautiful moment by sharing your photos
          </p>
          <div className="max-w-md mx-auto">
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <div className="mb-8 text-center">
          <h1>
            Welcome!
          </h1>
          <p>
            Thank you for being part of our special day 💕
          </p>
        </div>

        {currentView === "gallery" && <PhotoGallery />}
        {currentView === "upload" && <PhotoUpload />}
        {currentView === "slideshow" && <Slideshow />}
        {currentView === "admin" && <AdminPanel />}
      </Authenticated>
    </div>
  );
}
