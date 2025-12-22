"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [flow, setFlow] = useState<"signIn" | "signUp" | "reset" | "reset-verification">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [validatedEmail, setValidatedEmail] = useState<string>("");

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate token format (should be alphanumeric and reasonable length)
  const isValidToken = (token: string): boolean => {
    // Token should be alphanumeric, between 20-200 characters
    const tokenRegex = /^[a-zA-Z0-9_-]{20,200}$/;
    return tokenRegex.test(token);
  };

  // Check if URL contains password reset token
  useEffect(() => {
    const code = searchParams.get("code");
    const email = searchParams.get("email");
    
    // Validate both code and email before proceeding
    if (code && email && isValidToken(code) && isValidEmail(email)) {
      setFlow("reset-verification");
      setResetToken(code);
      setValidatedEmail(email);
    } else if (code || email) {
      // If either parameter exists but validation fails, show error
      setError("Invalid or malformed reset link. Please request a new password reset.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const newPassword = formData.get("newPassword") as string;

    try {
      if (flow === "signUp") {
        await signIn("password", { email, password, name, flow: "signUp" });
        toast.success("Account created successfully!");
      } else if (flow === "signIn") {
        await signIn("password", { email, password, flow: "signIn" });
        toast.success("Signed in successfully!");
      } else if (flow === "reset") {
        await signIn("password", { email, flow: "reset" });
        toast.success("Password reset link sent! Check your email.");
        setFlow("signIn"); // Return to sign in page
      } else if (flow === "reset-verification") {
        if (!resetToken) {
          throw new Error("Invalid reset link");
        }
        await signIn("password-reset", { 
          email, 
          code: resetToken,
          newPassword
        });
        toast.success("Password reset successfully! You can now sign in.");
        setFlow("signIn");
      }
    } catch (e: any) {
      console.error("Auth error:", e);
      // Simplify error message for the user
      if (flow === "signIn") {
        setError("Your email or password may be incorrect. Please try again.");
      } else if (flow === "signUp" && e.message?.includes("short")) {
        setError("Password must be at least 8 characters");
      } else if (flow === "reset-verification") {
        setError("Invalid or expired reset link. Please request a new one.");
      } else {
        setError(e.message || "Something went wrong. Please try again.");
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
            {flow === "reset-verification" && "Set New Password"}
          </h2>
          <p className="text-sm text-card-text/80 mt-2">
            {flow === "signIn" && "Sign in to access the gallery"}
            {flow === "signUp" && "Join us to share your photos"}
            {flow === "reset" && "Enter your email to receive a reset link"}
            {flow === "reset-verification" && "Choose a new password for your account"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-shake">
            <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium">
              {error}
            </p>
          </div>
        )}

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
              defaultValue={validatedEmail}
              required
            />
          </div>

          {flow === "reset-verification" && (
            <div>
              <label className="block text-sm font-medium text-card-text mb-2">New Password</label>
              <input
                className="bg-input-bg w-full px-4 py-3 rounded-lg border border-input-border focus:border-card-border focus:ring-2 focus:ring-card-border outline-hidden transition-all text-card-text placeholder-card-text/50"
                type="password"
                name="newPassword"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          )}

          {flow !== "reset" && flow !== "reset-verification" && (
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
              flow === "reset" ? "Send Reset Link" :
              "Reset Password"
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
                  onClick={() => { setFlow("signUp"); setError(null); }}
                  className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
                >
                  Sign up
                </button>
              </p>
              <button
                type="button"
                onClick={() => { setFlow("reset"); setError(null); }}
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
                onClick={() => { setFlow("signIn"); setError(null); }}
                className="text-purple-600 font-semibold hover:text-purple-800 transition-colors"
              >
                Sign in
              </button>
            </p>
          )}
          {(flow === "reset" || flow === "reset-verification") && (
            <button
              type="button"
              onClick={() => { setFlow("signIn"); setError(null); }}
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
