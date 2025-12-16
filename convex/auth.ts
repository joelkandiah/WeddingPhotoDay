import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import * as bcrypt from 'bcrypt';

// --- Configuration ---
// IMPORTANT: Store these in Convex environment variables!
const HASHED_PASSWORDS = {
  user: process.env.USER_PASSWORD_HASH || '', // MUST BE A HASHED PASSWORD
  admin: process.env.ADMIN_PASSWORD_HASH || '', // MUST BE A HASHED PASSWORD
};

const BCRYPT_SALT_ROUNDS = 10;
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24; // 24 hours

// --- Type Definitions ---
export const Role = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export type RoleType = typeof Role[keyof typeof Role];

// --- Helper: Get User from _auth table ---
async function getUserFromAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    return null;
  }

  // Query the _auth table using the token identifier
  const authUser = await ctx.db
    .query('_auth')
    .filter((q: any) => q.eq(q.field('tokenIdentifier'), identity.tokenIdentifier))
    .first();

  // ** 3. SESSION EXPIRATION CHECK **
  if (authUser && authUser.sessionExpiresAt < Date.now()) {
    // Session has expired, clear the role/record to force sign-in
    await ctx.db.delete(authUser._id);
    return null;
  }

  return authUser;
}

// --- Helper: Require Authentication ---
async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error('Not authenticated. Please log in.');
  }

  // Get the user from _auth table to check their role (and session expiration)
  const authUser = await getUserFromAuth(ctx); // Use the helper with expiration check

  if (!authUser || !authUser.role) {
    throw new Error('Session expired or no role assigned. Please sign in again.');
  }

  return authUser;
}

// --- Helper: Require Admin ---
export async function requireAdmin(ctx: any) {
  const authUser = await requireAuth(ctx);

  if (authUser.role !== Role.ADMIN) {
    throw new Error('Admin access required.');
  }

  return authUser;
}

// --- Public Authentication API ---

/**
 * 1. Renamed to signIn. 2. Uses Hashed Passwords. 3. Sets session expiry.
 * Login with a role-specific password and sets a session expiration timestamp.
 */
export const signIn = mutation({
  args: {
    role: v.union(v.literal('user'), v.literal('admin')),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const { role, password } = args;

    const storedHash = HASHED_PASSWORDS[role as RoleType];

    if (!storedHash) {
      throw new Error(`Configuration error: No hash found for role: ${role}`);
    }

    // ** 2. SERVER-SIDE HASHED PASSWORD verification **
    const passwordMatch = await bcrypt.compare(password, storedHash);

    if (!passwordMatch) {
      throw new Error('Invalid password for this role');
    }

    // Get or create auth identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Failed to create session. Please try again.');
    }

    const sessionExpiresAt = Date.now() + SESSION_DURATION_MS;

    // Check if user already exists in _auth table
    const existingUser = await ctx.db
      .query('_auth')
      .filter((q: any) => q.eq(q.field('tokenIdentifier'), identity.tokenIdentifier))
      .first();

    if (existingUser) {
      // Update existing user's role and session expiry
      await ctx.db.patch(existingUser._id, {
        role: role as RoleType,
        lastLogin: Date.now(),
        sessionExpiresAt, // Set new expiration time
      });
    } else {
      // Create new auth entry
      await ctx.db.insert('_auth', {
        tokenIdentifier: identity.tokenIdentifier,
        role: role as RoleType,
        createdAt: Date.now(),
        lastLogin: Date.now(),
        sessionExpiresAt, // Set expiration time
      });
    }

    return {
      success: true,
      role,
      message: `Signed in as ${role}`
    };
  },
});

/**
 * 1. Renamed to signOut.
 * Logout - removes role from _auth table
 */
export const signOut = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { success: true, message: 'Already signed out' };
    }

    const authUser = await ctx.db
      .query('_auth')
      .filter((q: any) => q.eq(q.field('tokenIdentifier'), identity.tokenIdentifier))
      .first();

    if (authUser) {
      // Delete the entry to effectively log them out
      await ctx.db.delete(authUser._id);
    }

    return { success: true, message: 'Signed out successfully' };
  },
});

/**
 * Get current user session
 * Now includes the session expiration check via getUserFromAuth helper.
 */
export const getCurrentUser = query({
  handler: async (ctx) => {
    // Uses the helper which includes the session expiration check
    const authUser = await getUserFromAuth(ctx);

    if (!authUser || !authUser.role) {
      return null;
    }

    return {
      role: authUser.role,
      isAuthenticated: true,
      userId: authUser._id,
      sessionExpiresAt: authUser.sessionExpiresAt, // Return expiry time
    };
  },
});


/**
 * Helper utility to hash passwords for initial setup.
 * THIS IS NOT FOR PRODUCTION USE! Run it once to get the hash for environment variables.
 * For example: convex run auth:hashPasswordForSetup "user123"
 */
export const hashPasswordForSetup = mutation({
  args: {
    password: v.string(),
  },
  handler: async (_ctx, args) => {
    const hashedPassword = await bcrypt.hash(args.password, BCRYPT_SALT_ROUNDS);
    return {
      hash: hashedPassword,
      message: 'Use this hash in your environment variables for USER_PASSWORD_HASH or ADMIN_PASSWORD_HASH'
    };
  },
});