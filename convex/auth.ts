import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { DataModel } from "./_generated/dataModel";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Define interface for user identity with role
interface UserIdentity {
  subject: string;
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
}

// Use Anonymous provider as the base for sitewide login
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Anonymous],
});

// Simple constant-time comparison helper
// This helps prevent timing attacks by ensuring comparison takes the same time
// regardless of where the mismatch occurs
const secureCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

// Custom mutation to verify password before sign-in
// This is called BEFORE anonymous sign-in to validate the password
export const verifyPassword = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { password } = args;

    // Get passwords from environment variables
    const userPassword = process.env.USER_PASSWORD || 'user123';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Determine role based on password match
    if (secureCompare(password, adminPassword)) {
      return {
        success: true,
        role: 'admin' as const,
      };
    } else if (secureCompare(password, userPassword)) {
      return {
        success: true,
        role: 'user' as const,
      };
    } else {
      throw new Error("Invalid password");
    }
  },
});

// Custom mutation for setting user role after anonymous sign-in
// This is called AFTER anonymous sign-in to set the role on the user
export const signInWithPassword = mutation({
  args: {
    role: v.union(v.literal('user'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    const { role } = args;

    // Get the current user ID using the auth library helper
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("No active session. Please try signing in again.");
    }

    // Get the user record
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User session not found. Please try signing in again.");
    }

    // Update the user's role and other info
    await ctx.db.patch(user._id, {
      role: role,
      email: `${role}@wedding.local`,
      name: role === 'admin' ? 'Admin' : 'Guest',
    });

    return {
      success: true,
      role: role,
    };
  },
});

// Query to get the logged-in user
export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get user from database to retrieve role
    const user = await ctx.db.get(userId);

    if (!user) {
      return null;
    }
    
    // If user doesn't have a role yet, they haven't completed the password verification
    // Treat them as unauthenticated
    if (!user.role) {
      return null;
    }
    
    // Return user info
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

// Query to check if current user is admin
export const isAdmin = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    // Get user from database to check role
    const user = await ctx.db.get(userId);

    return user?.role === 'admin';
  },
});