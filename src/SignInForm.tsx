"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [flow, setFlow] = useState<"signIn" | "signUp" | "reset">("signIn");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      if (flow === "signUp") {
        await signIn("password", { email, password, name, flow: "signUp" });
        toast.success("Account created successfully!");
      } else if (flow === "signIn") {
        await signIn("password", { email, password, flow: "signIn" });
        toast.success("Signed in successfully!");
      } else if (flow === "reset") {
        await signIn("password", { email, flow: "reset" });
        toast.success("Password reset email sent (if configured)");
        setFlow("signIn"); // Return to sign in page
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      const msg = error.message || "Authentication failed";
      // Handle "Password is too short" etc
      if (msg.includes("short")) {
        toast.error("Password must be at least 8 characters");
      } else {
        toast.error(msg);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card-bg rounded-2xl shadow-lg border border-card-border p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-card-text">
            {flow === "signIn" && "Welcome Back"}
            {flow === "signUp" && "Create Account"}
            {flow === "reset" && "Reset Password"}
          </h2>
          <p className="text-sm text-card-text/80 mt-2">
            {flow === "signIn" && "Sign in to access the gallery"}
            {flow === "signUp" && "Join us to share your photos"}
            {flow === "reset" && "Enter your email to receive a reset link"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {flow === "signUp" && (
            <div>
              <label className="block text-sm font-medium text-card-text mb-2">Name</label>
              <input
                className="bg-input-bg w-full px-4 py-3 rounded-lg border border-input-border focus:border-card-border focus:ring-2 focus:ring-card-border outline-hidden transition-all text-card-text placeholder-card-text/50"
                type="text"
                name="name"
                placeholder="Your Name"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-card-text mb-2">Email</label>
            <input
              className="bg-input-bg w-full px-4 py-3 rounded-lg border border-input-border focus:border-card-border focus:ring-2 focus:ring-card-border outline-hidden transition-all text-card-text placeholder-card-text/50"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </div>

          {flow !== "reset" && (
            <div>
              <label className="block text-sm font-medium text-card-text mb-2">Password</label>
              <input
                className="bg-input-bg w-full px-4 py-3 rounded-lg border border-input-border focus:border-card-border focus:ring-2 focus:ring-card-border outline-hidden transition-all text-card-text placeholder-card-text/50"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          )}

          <button
            className="w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white font-semibold py-4 rounded-lg hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Processing..." : (
              flow === "signIn" ? "Sign In" :
              flow === "signUp" ? "Create Account" :
              "Send Reset Link"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-card-text space-y-2">
          {flow === "signIn" && (
            <>
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setFlow("signUp")}
                  className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
                >
                  Sign up
                </button>
              </p>
              <button
                type="button"
                onClick={() => setFlow("reset")}
                className="text-card-text/70 hover:text-card-text transition-colors"
              >
                Forgot password?
              </button>
            </>
          )}
          {flow === "signUp" && (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setFlow("signIn")}
                className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
              >
                Sign in
              </button>
            </p>
          )}
          {flow === "reset" && (
            <button
              type="button"
              onClick={() => setFlow("signIn")}
              className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
