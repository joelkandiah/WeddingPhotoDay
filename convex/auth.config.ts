const siteUrl = process.env.CONVEX_SITE_URL;
const cloudUrl = process.env.CONVEX_CLOUD_URL;

// Derive the domain from cloud URL if site URL is missing
// The backend needs to know its own URL to verify tokens issued by itself
let domain = siteUrl;
if (!domain && cloudUrl) {
  domain = cloudUrl.replace(".convex.cloud", ".convex.site");
}

if (!domain) {
  // Fallback to the known production ID if environments don't have vars
  domain = "https://cool-kookabura-203.convex.site";
}

// Ensure https
if (domain && !domain.startsWith("http")) {
  domain = `https://${domain}`;
}

// Remove trailing slash if present
if (domain && domain.endsWith("/")) {
  domain = domain.slice(0, -1);
}

console.log("Auth Config Loaded. Domain:", domain);

export default {
  providers: [
    {
      domain: domain,
      applicationID: "convex",
    },
  ],
};
