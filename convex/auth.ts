import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import bcrypt from "bcryptjs";

// Use Anonymous provider as the base for sitewide login
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Anonymous],
});

const secureCompare = (password: string, hash: string): boolean => {
  try {
    console.log("Comparing password with hash:", hash.substring(0, 7) + "...");
    const result = bcrypt.compareSync(password, hash);
    console.log("Comparison result:", result);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
};

// Custom mutation to verify password before sign-in
// This is called BEFORE anonymous sign-in to validate the password
export const verifyPassword = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { password } = args;

    // Get hashed passwords from environment variables
    const userPasswordHash = process.env.USER_PASSWORD_HASH;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!userPasswordHash) {
      console.error("USER_PASSWORD_HASH is missing in environment variables");
    }
    if (!adminPasswordHash) {
      console.error("ADMIN_PASSWORD_HASH is missing in environment variables");
    }

    if (!userPasswordHash || !adminPasswordHash) {
      throw new Error("Authenticaton is currently unavailable due to missing server configuration. Please check USER_PASSWORD_HASH and ADMIN_PASSWORD_HASH environment variables in the Convex dashboard.");
    }

    // Determine role based on password match
    if (secureCompare(password, adminPasswordHash)) {
      return {
        success: true,
        role: 'admin' as const,
      };
    } else if (secureCompare(password, userPasswordHash)) {
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