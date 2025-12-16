// convex/lib/auth-credentials.ts

// Use an enum type to enumerate the possible roles
export enum Role {
    USER = 'user',
    ADMIN = 'admin',
}

/**
 * Defines the structure of the identity object used by Convex
 * after a successful login resolution.
 */
export interface CustomIdentity {
    _id: Role;
    role: Role;
}