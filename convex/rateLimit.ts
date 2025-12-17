import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
    // Define rate limits for different actions
    upload: {
        kind: "token bucket",
        rate: 150,
        period: HOUR,
        capacity: 150,
    },
});
