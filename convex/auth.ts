import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { v } from 'convex/values';

// Custom password provider for sitewide login
// Automatically determines role based on which password is entered
const SitewidePassword = Password<DataModel>({
  profile(params) {
    // Role is determined during verification
    const role = (params as any).role || 'user';
    return {
      email: `${role}@wedding.local`,
      name: role === 'admin' ? 'Admin' : 'Guest',
      role: role,
    };
  },
  // Custom verification logic - determines role based on password match
  async verify(params, credentials: { password?: string }) {
    const { password } = credentials;
    
    if (!password) {
      throw new Error("Password is required");
    }

    // Get passwords from environment variables
    // For production, use hashed passwords
    const userPassword = process.env.USER_PASSWORD || 'user123';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Check which password matches and assign role accordingly
    if (password === adminPassword) {
      return { role: 'admin' };
    }
    if (password === userPassword) {
      return { role: 'user' };
    }

    throw new Error("Invalid password");
  },
});

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [SitewidePassword],
});

// Query to get the logged-in user
export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return null;
    }
    
    // Return user info from the session
    return {
      id: userId.subject,
      email: userId.email,
      name: userId.name,
      role: (userId as any).role || 'user',
    };
  },
});

// Query to check if current user is admin
export const isAdmin = query({
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return false;
    }
    return (userId as any).role === 'admin';
  },
});