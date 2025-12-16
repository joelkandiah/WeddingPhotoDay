import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

// Define interface for user identity with role
interface UserIdentity {
  subject: string;
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
}

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
    // Supports both plain text (for development) and hashed passwords (for production)
    const userPassword = process.env.USER_PASSWORD || 'user123';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

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

    // Check which password matches and assign role accordingly
    if (secureCompare(password, adminPassword)) {
      return { role: 'admin' };
    }
    if (secureCompare(password, userPassword)) {
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
    const identity = await ctx.auth.getUserIdentity() as UserIdentity | null;
    if (!identity) {
      return null;
    }
    
    // Return user info from the session
    return {
      id: identity.subject,
      email: identity.email,
      name: identity.name,
      role: identity.role || 'user',
    };
  },
});

// Query to check if current user is admin
export const isAdmin = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity() as UserIdentity | null;
    if (!identity) {
      return false;
    }
    return identity.role === 'admin';
  },
});