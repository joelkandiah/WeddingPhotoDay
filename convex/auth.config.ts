// Strip trailing slash from CONVEX_SITE_URL
const siteUrl = process.env.CONVEX_SITE_URL?.replace(/\/$/, '');

if (!siteUrl && process.env.NODE_ENV === "production") {
  console.warn("CONVEX_SITE_URL is not set in production. Anonymous sign-in will likely fail. Please set CONVEX_SITE_URL environment variable in the Convex dashboard.");
}

export default {
  providers: [
    {
      domain: siteUrl || "https://kindly-horse-40.convex.site",
      applicationID: "convex",
    },
  ],
};
