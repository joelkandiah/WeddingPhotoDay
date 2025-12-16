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
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Enter Site Password
        </h2>
        <p className="text-sm text-gray-600">
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
            
            // First, sign in anonymously to get a session
            await signIn("anonymous");
            
            // Then verify the password and set the role
            const result = await signInWithPassword({ password });
            
            if (result.success) {
              toast.success(`Welcome! Signed in as ${result.role}`);
            }
          } catch (error: any) {
            console.error("Sign in error:", error);
            toast.error(error.message || "Invalid password. Please try again.");
            setSubmitting(false);
          }
        }}
      >
        <input
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-lg"
          type="password"
          name="password"
          placeholder="Enter password"
          required
          autoFocus
        />
        <button 
          className="w-full px-4 py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-lg font-medium hover:from-rose-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          type="submit" 
          disabled={submitting}
        >
          {submitting ? "Signing in..." : "Enter Site"}
        </button>
      </form>
    </div>
  );
}
