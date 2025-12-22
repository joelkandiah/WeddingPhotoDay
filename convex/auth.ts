import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Resend } from "resend";

// Email configuration for password reset
const RESET_EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "Wedding Photos <onboarding@resend.dev>";

// Use Password provider for authentication
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        return {
          email: params.email as string,
          name: params.name as string,
        };
      },
      reset: {
        id: "password-reset",
        type: "email",
        name: "Password Reset",
        from: RESET_EMAIL_FROM,
        maxAge: 60 * 15, // 15 minutes
        async sendVerificationRequest({ identifier: email, url, token }) {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) {
            throw new Error("RESEND_API_KEY environment variable is not set");
          }

          const resend = new Resend(resendApiKey);

          // Get the frontend site URL from environment or use default
          // SITE_URL should point to the frontend (e.g., Vercel deployment)
          // not CONVEX_SITE_URL which points to the Convex backend
          const siteUrl = process.env.SITE_URL || "http://localhost:5173";
          
          // Construct the reset URL with code and email parameters
          const resetUrl = `${siteUrl}/?code=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

          try {
            await resend.emails.send({
              from: RESET_EMAIL_FROM,
              to: email,
              subject: "Reset your password",
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
                  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <h1 style="color: #1f2937; font-size: 28px; margin-bottom: 20px; text-align: center;">Reset Your Password</h1>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                      You requested to reset your password. Click the button below to set a new password. This link will expire in 15 minutes.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(to right, #3b82f6, #6366f1, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                      If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                      Or copy and paste this URL into your browser:<br>
                      <span style="word-break: break-all;">${resetUrl}</span>
                    </p>
                  </div>
                </body>
                </html>
              `,
            });
          } catch (error) {
            console.error("Failed to send password reset email:", error);
            throw new Error("Failed to send password reset email");
          }
        },
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      const { userId } = args;
      const user = await ctx.db.get(userId);
      // If user has no role, assign default 'user' role
      if (user && !user.role) {
        await ctx.db.patch(userId, { role: "user" });
      }
    },
  },
});

export const loggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    return user;
  },
});

export const getUserId = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }
    const user = await ctx.db.get(userId);
    return user?.role === "admin";
  },
});