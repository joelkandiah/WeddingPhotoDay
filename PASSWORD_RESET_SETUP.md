# Password Reset Setup with Resend

This document explains how to set up password reset functionality using Resend for email delivery.

## Overview

The password reset feature allows users who have forgotten their password to receive a one-time link via email to reset their password. The implementation uses:

- **@convex-dev/auth** Password provider with reset configuration
- **Resend** for email delivery
- Time-limited reset tokens (15 minutes expiration)

## Required Environment Variables

You need to set the following environment variables in your Convex deployment:

### 1. RESEND_API_KEY (Required)

This is your Resend API key for sending emails.

**How to get it:**
1. Sign up for a free account at [resend.com](https://resend.com)
2. Navigate to **API Keys** in your Resend dashboard
3. Click **Create API Key**
4. Give it a name (e.g., "Wedding Photo App")
5. Select the appropriate permissions (you need "Sending access")
6. Copy the API key (it will only be shown once)

**Set it in Convex:**
```bash
npx convex env set RESEND_API_KEY re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. RESEND_FROM_EMAIL (Optional)

The email address that will appear in the "From" field of password reset emails.

**Default value:** `Wedding Photos <onboarding@resend.dev>`

**How to set a custom email:**
1. In your Resend dashboard, go to **Domains**
2. Add and verify your domain (e.g., `example.com`)
3. Once verified, you can use any email address from that domain

**Set it in Convex:**
```bash
npx convex env set RESEND_FROM_EMAIL "Your App Name <noreply@yourdomain.com>"
```

**Note:** If you use Resend's free tier, you can send emails from `onboarding@resend.dev` for testing purposes, but you'll need to add recipient email addresses to your account. For production, you should verify your own domain.

### 3. SITE_URL or CONVEX_SITE_URL (Optional for development)

The URL of your application where users will be redirected to reset their password.

**Default value:** `http://localhost:5173` (for local development)

**For production deployment:**
```bash
npx convex env set SITE_URL https://your-production-domain.com
```

The password reset email will include a link like:
```
https://your-production-domain.com/?code=RESET_TOKEN&email=user@example.com
```

## How It Works

### User Flow

1. **Request Reset:**
   - User clicks "Forgot password?" on the sign-in page
   - User enters their email address
   - User clicks "Send Reset Link"

2. **Receive Email:**
   - User receives an email with a "Reset Password" button
   - The link is valid for 15 minutes
   - The link contains a secure token and the user's email

3. **Reset Password:**
   - User clicks the link in the email
   - User is taken to the sign-in page with a "Set New Password" form
   - User enters their email (pre-filled) and a new password
   - User clicks "Reset Password"
   - User is automatically signed in with the new password

### Security Features

- **Token expiration:** Reset links expire after 15 minutes
- **One-time use:** Each token can only be used once
- **Secure tokens:** Tokens are cryptographically secure
- **Email verification:** The token is tied to the specific email address

## Testing

### Development Testing

For local development testing:

1. **Set up Resend:**
   ```bash
   npx convex env set RESEND_API_KEY your_resend_api_key
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Test the flow:**
   - Navigate to http://localhost:5173
   - Click "Forgot password?"
   - Enter a valid user email
   - Check the email inbox (or Resend dashboard for sent emails)
   - Click the reset link
   - Set a new password

### Production Testing

1. **Set all environment variables:**
   ```bash
   npx convex env set RESEND_API_KEY your_resend_api_key
   npx convex env set RESEND_FROM_EMAIL "Your App <noreply@yourdomain.com>"
   npx convex env set SITE_URL https://your-production-domain.com
   ```

2. **Deploy to production:**
   ```bash
   npx convex deploy
   npm run build
   # Deploy your frontend to your hosting provider
   ```

3. **Test the password reset flow** with a real user account

## Troubleshooting

### "RESEND_API_KEY environment variable is not set"

**Problem:** The Resend API key is not configured in Convex.

**Solution:**
```bash
npx convex env set RESEND_API_KEY your_resend_api_key
```

### "Failed to send password reset email"

**Possible causes:**
1. Invalid Resend API key
2. Resend account suspended or rate limited
3. Invalid "from" email address
4. Network connectivity issues

**Solution:** Check your Resend dashboard for error logs and verify your API key is correct.

### Email not received

**Possible causes:**
1. Email in spam folder
2. Using Resend's test email (`onboarding@resend.dev`) without adding recipient to allowed list
3. Domain not verified (if using custom email)

**Solution:**
- Check spam/junk folder
- For Resend free tier, add recipient email to your account settings
- Verify your domain in Resend dashboard

### "Invalid or expired reset link"

**Possible causes:**
1. Reset link expired (15 minutes)
2. Reset link already used
3. Token malformed or corrupted

**Solution:** Request a new password reset link.

## Email Customization

The password reset email template is defined in `convex/auth.ts`. You can customize:

- Email subject
- Email body HTML
- Styles and branding
- Button text
- Expiration time (default: 15 minutes)

Example customization:
```typescript
reset: {
  id: "password-reset",
  type: "email",
  maxAge: 60 * 30, // Change to 30 minutes
  async sendVerificationRequest({ identifier: email, token }) {
    // Customize email template here
  },
},
```

## Support

For issues with:
- **Resend:** Visit [resend.com/docs](https://resend.com/docs) or contact Resend support
- **Convex Auth:** Visit [auth.convex.dev](https://auth.convex.dev) or Convex documentation
- **This implementation:** Check the code in `convex/auth.ts` and `src/SignInForm.tsx`
