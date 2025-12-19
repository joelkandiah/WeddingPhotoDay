"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

// Configuration for session establishment retry logic
const SESSION_RETRY_ATTEMPTS = 5;
const SESSION_RETRY_DELAY_MS = 200;

export function SignInForm() {
  const { signIn } = useAuthActions();
  const signInWithPassword = useMutation(api.auth.signInWithPassword);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2>
          Enter Site Password
        </h2>
        <p className="text-sm">
          Enter the password to access the wedding photo gallery
        </p>
      </div>
      
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          
          try {
            const formData = new FormData(e.target as HTMLFormElement);
            const password = formData.get("password") as string;
            
            // First, sign in anonymously to establish a session
            await signIn("anonymous");
            
            // Retry logic: the session may take a moment to be established
            // Try calling signInWithPassword with retries
            let retries = SESSION_RETRY_ATTEMPTS;
            
            while (retries > 0) {
              try {
                const result = await signInWithPassword({ password });
                
                // The mutation returns success: true if role was assigned
                if (result.success) {
                  toast.success(`Welcome! Signed in as ${result.role}`);
                  // Success - break out of retry loop
                  break;
                } else {
                  // Unexpected: mutation didn't throw but also didn't succeed
                  throw new Error("Authentication failed unexpectedly");
                }
              } catch (error: any) {
                const errorMessage = error.message || "";
                
                // If it's a "No active session" error, retry after a short delay
                // Note: This string matching is fragile but necessary as Convex errors don't have codes
                if (errorMessage.includes("No active session") && retries > 1) {
                  console.log(`Session not ready yet, retrying... (${retries - 1} retries left)`);
                  await new Promise(resolve => setTimeout(resolve, SESSION_RETRY_DELAY_MS));
                  retries--;
                } else {
                  // Other errors or out of retries - throw
                  throw error;
                }
              }
            }
          } catch (error: any) {
            console.error("SignInForm: Sign in error:", error);
            const errorMessage = error.message || "";
            
            if (errorMessage.includes("Server Error") || errorMessage.includes("action failed")) {
              toast.error("Server Configuration Error: Please ensure JWKS keys and Environment Variables are set in the Convex Dashboard.");
            } else {
              toast.error(errorMessage || "Invalid password. Please try again.");
            }
            setSubmitting(false);
          }
        }}
      >
        <input
          className="auth-input-field text-lg"
          type="password"
          name="password"
          placeholder="Enter password"
          required
          autoFocus
        />
        <button 
          className="auth-button bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all"
          type="submit" 
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Enter Site"}
        </button>
      </form>
    </div>
  );
}
