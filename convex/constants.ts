import { v } from "convex/values";

// Post categories
export const POST_CATEGORIES = [
  "US Ceremony",
  "Reception",
  "Getting Ready",
  "The Journey Here",
  "The Journey Home",
  "UK Celebration",
  "Legal Ceremony",
  "Engagement",
] as const;

export type PostCategory = typeof POST_CATEGORIES[number];

// Category validator for Convex
export const categoryValidator = v.union(
  v.literal("US Ceremony"),
  v.literal("Reception"),
  v.literal("Getting Ready"),
  v.literal("The Journey Here"),
  v.literal("The Journey Home"),
  v.literal("UK Celebration"),
  v.literal("Legal Ceremony"),
  v.literal("Engagement")
);
