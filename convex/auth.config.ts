const rawSiteUrl = process.env.CONVEX_SITE_URL;

// Strip trailing slashes from CONVEX_SITE_URL
const siteUrl = rawSiteUrl ? rawSiteUrl.replace(/\/+$/, '') : rawSiteUrl;

if (!siteUrl && process.env.NODE_ENV === "production") {
  throw new Error("CONVEX_SITE_URL is not set in production. Anonymous sign-in will fail. Please set CONVEX_SITE_URL environment variable in the Convex dashboard.");
}

export default {
  providers: [
    {
      domain: siteUrl || "https://kindly-horse-40.convex.site",
      applicationID: "convex",
    },
  ],
};
