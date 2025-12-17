const siteUrl = process.env.CONVEX_SITE_URL;

if (!siteUrl && process.env.NODE_ENV === "production") {
  console.warn("CONVEX_SITE_URL is not set in production. Anonymous sign-in will likely fail.");
}

export default {
  providers: [
    {
      domain: siteUrl || "https://kindly-horse-40.convex.site",
      applicationID: "convex",
    },
  ],
};
