"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

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
            let retries = 5;
            let lastError: Error | null = null;
            
            while (retries > 0) {
              try {
                const result = await signInWithPassword({ password });
                
                if (result.success) {
                  toast.success(`Welcome! Signed in as ${result.role}`);
                }
                // Success - break out of retry loop
                break;
              } catch (error: any) {
                lastError = error;
                const errorMessage = error.message || "";
                
                // If it's a "No active session" error, retry after a short delay
                if (errorMessage.includes("No active session") && retries > 1) {
                  console.log(`Session not ready yet, retrying... (${retries - 1} retries left)`);
                  await new Promise(resolve => setTimeout(resolve, 200));
                  retries--;
                } else {
                  // Other errors or out of retries - throw
                  throw error;
                }
              }
            }
            
            // If we exhausted retries, throw the last error
            if (retries === 0 && lastError) {
              throw lastError;
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
