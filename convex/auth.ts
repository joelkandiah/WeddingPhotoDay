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

// Server-authoritative mutation to verify password and assign role
// This is called AFTER anonymous sign-in to validate password and set role
// The server determines the role based on password match, preventing client tampering
export const signInWithPassword = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { password } = args;

    // Get the current user ID - must be authenticated first via anonymous sign-in
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      console.error("signInWithPassword: No userId found");
      throw new Error("No active session. Please sign in first.");
    }

    // Get the user record
    const user = await ctx.db.get(userId);

    if (!user) {
      console.error("signInWithPassword: User record not found for userId:", userId);
      throw new Error("User session not found. Please try signing in again.");
    }

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
      throw new Error("Authentication is currently unavailable due to missing server configuration. Please check USER_PASSWORD_HASH and ADMIN_PASSWORD_HASH environment variables in the Convex dashboard.");
    }

    // Determine role based on password match - SERVER DECIDES, not client
    let role: 'admin' | 'user';
    if (secureCompare(password, adminPasswordHash)) {
      role = 'admin';
    } else if (secureCompare(password, userPasswordHash)) {
      role = 'user';
    } else {
      throw new Error("Invalid password");
    }

    // Update the user's role and other info
    await ctx.db.patch(user._id, {
      role: role,
      email: `${role}@wedding.local`,
      name: role === 'admin' ? 'Admin' : 'Guest',
    });

    console.log("signInWithPassword: Successfully set role to:", role);

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