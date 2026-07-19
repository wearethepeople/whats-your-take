import { sql } from "drizzle-orm";
import { db } from "~/db/client.server";

export async function loader() {
  try {
    db.get(sql`select 1`);
    return new Response("OK");
  } catch (error) {
    console.error("healthcheck failed", error);
    return new Response("ERROR", { status: 500 });
  }
}
