import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/db/schema.server.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/sqlite.db",
  },
});
