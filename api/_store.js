import { Redis } from "@upstash/redis";

// Vercel's Marketplace Redis integrations have used a couple of different
// env var naming conventions over time (KV_REST_API_* from the old "Vercel KV"
// product, UPSTASH_REDIS_REST_* from the native Upstash integration). Support
// both so this works with whichever one ends up linked to the project.
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;
