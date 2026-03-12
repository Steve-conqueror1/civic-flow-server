import { createClient } from "redis";
import { env } from "./env";

export const redisClient = createClient({ url: env.REDIS_URL });

redisClient.on("error", (err) => {
  console.error("Redis client error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

(async () => {
  await redisClient.connect();
})().catch((err) => {
  console.error("Failed to connect to Redis:", err.message);
  process.exit(1);
});

export const bullMQConnection = {
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
};
