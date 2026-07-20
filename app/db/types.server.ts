import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "./schema.server";

export type Db = BetterSQLite3Database<typeof schema>;
// The synchronous transaction handle passed to db.transaction callbacks;
// domain functions accept either so they compose inside transactions.
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
