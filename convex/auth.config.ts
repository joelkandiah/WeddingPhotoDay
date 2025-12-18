// Strip trailing slash from CONVEX_SITE_URL
const siteUrl = process.env.CONVEX_SITE_URL?.replace(/\/$/, '');

console.log("Auth config - CONVEX_SITE_URL:", process.env.CONVEX_SITE_URL);
console.log("Auth config - siteUrl (after stripping slash):", siteUrl);
console.log("Auth config - NODE_ENV:", process.env.NODE_ENV);

if (!siteUrl && process.env.NODE_ENV === "production") {
  console.warn("CONVEX_SITE_URL is not set in production. Anonymous sign-in will likely fail. Please set CONVEX_SITE_URL environment variable in the Convex dashboard.");
}

const domain = siteUrl || "https://cool-kookabura-203.convex.site";
console.log("Auth config - final domain:", domain);

export default {
  providers: [
    {
      domain: domain,
      applicationID: "convex",
    },
  ],
};
