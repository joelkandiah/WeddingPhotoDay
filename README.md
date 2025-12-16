# Wedding Photo Sharing App
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).
  
This project is connected to the Convex deployment named [`kindly-horse-40`](https://dashboard.convex.dev/d/kindly-horse-40).
  
## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

This app uses **sitewide login** with [Convex Auth](https://auth.convex.dev/). Users enter a single password to access the site, and the backend automatically determines their role (user or admin) based on which password matches.

### Setting up passwords

To configure the site passwords, set the following environment variables in your Convex deployment:

- `USER_PASSWORD` - Password for regular users (default: `user123`)
- `ADMIN_PASSWORD` - Password for admin users (default: `admin123`)

**Important:** The default passwords are for development only. Change them before deploying to production!

To set environment variables in Convex:
```bash
npx convex env set USER_PASSWORD your_user_password
npx convex env set ADMIN_PASSWORD your_admin_password
```

**Security Notes:**
- Passwords are compared using constant-time comparison to prevent timing attacks
- For production, use strong, unique passwords for both roles
- The current implementation uses plain text passwords stored in environment variables
- For enhanced security, consider implementing bcrypt hashing for password storage

### How it works

1. Users see a simple password input on the homepage
2. When they submit the password, the backend checks if it matches either the user or admin password
3. If it matches the admin password, they're logged in as admin with access to approve/reject photos
4. If it matches the user password, they're logged in as a regular user who can upload and view photos
5. Invalid passwords are rejected

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
