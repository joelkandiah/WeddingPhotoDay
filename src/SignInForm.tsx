"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

export function SignInForm() {
  const { signIn, signOut } = useAuthActions();
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

  // Validate reset code format (should be alphanumeric and reasonable length)
  const isValidResetCode = (code: string): boolean => {
    // Code should be alphanumeric, between 20-200 characters
    const codeRegex = /^[a-zA-Z0-9_-]{20,200}$/;
    return codeRegex.test(code);
  };

  // Check if URL contains password reset token
  // Using "resetCode" instead of "code" to prevent ConvexAuthProvider from
  // automatically consuming the token before the user enters their new password
  useEffect(() => {
    const resetCode = searchParams.get("resetCode");
    const email = searchParams.get("email");
    
    // Validate both resetCode and email before proceeding
    if (resetCode && email && isValidResetCode(resetCode) && isValidEmail(email)) {
      setFlow("reset-verification");
      setResetToken(resetCode);
      setValidatedEmail(email);
    } else if (resetCode || email) {
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
        if (!newPassword || newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters");
        }
        await signIn("password", { 
          email: validatedEmail, 
          code: resetToken,
          newPassword,
          flow: "reset-verification"
        });
        toast.success("Password reset successfully! You can now sign in.");
        setFlow("signIn");
        // Sign out the user if they are automatically signed in after reset
        await signOut();
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
      <div className="card p-8">
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
          <div className="mb-6 p-4 rounded-xl animate-shake" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
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
                className="input-field text-card-text placeholder-card-text/50"
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
              className="input-field text-card-text placeholder-card-text/50"
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
                className="input-field text-card-text placeholder-card-text/50"
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
                className="input-field text-card-text placeholder-card-text/50"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>
          )}

          <button
            className="btn-primary w-full py-4"
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
                  className="text-blue-600 font-semibold hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
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
                className="text-blue-600 font-semibold hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
              >
                Sign in
              </button>
            </p>
          )}
          {(flow === "reset" || flow === "reset-verification") && (
            <button
              type="button"
              onClick={() => { setFlow("signIn"); setError(null); }}
              className="text-blue-600 font-semibold hover:text-blue-800 transition-colors dark:text-blue-400 dark:hover:text-blue-300"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
