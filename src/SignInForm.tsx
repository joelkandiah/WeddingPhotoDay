"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const verifyPassword = useMutation(api.auth.verifyPassword);
  const setUserRole = useMutation(api.auth.signInWithPassword);
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
            
            // First, verify the password WITHOUT signing in
            // This will throw an error if the password is invalid
            console.log("Verifying password...");
            const verifyResult = await verifyPassword({ password });
            console.log("Password verified, role:", verifyResult.role);
            
            // Only sign in anonymously if password is valid
            console.log("Calling signIn('anonymous')...");
            await signIn("anonymous");
            console.log("signIn('anonymous') succeeded");
            
            // Now that we're signed in anonymously, assign the role
            // This must happen immediately after sign-in, not stored in localStorage
            console.log("Calling signInWithPassword with role:", verifyResult.role);
            const roleResult = await setUserRole({ role: verifyResult.role });
            console.log("signInWithPassword result:", roleResult);
            
            if (roleResult.success) {
              toast.success(`Welcome! Signed in as ${roleResult.role}`);
            }
          } catch (error: any) {
            console.error("Sign in error details:", error);
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
