import { Pool } from "pg";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("connect", () => {
  console.log("Database connected successfully");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err.message);
});

export const db = drizzle(pool);
