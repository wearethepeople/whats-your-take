// Corpus export (I3: export is a feature). Approved rows only (I5), and
// exactly four fields — body, channel, created_bucket, showcase — never an
// id or timestamp (I4). Rows are ordered (created_at, body): deterministic,
// and row order can never reconstruct intra-hour submission sequence. The
// same field set and ordering rule apply to the slice-5 public corpus.

import { and, asc, eq } from "drizzle-orm";
import { responses } from "~/db/schema.server";
import type { Db } from "~/db/types.server";

export type ExportRow = {
  body: string;
  channel: string;
  created_bucket: string;
  showcase: boolean;
};

export function exportRows(db: Db, eventId: number): ExportRow[] {
  return db
    .select({
      body: responses.body,
      channel: responses.channel,
      created_bucket: responses.createdBucket,
      showcase: responses.showcase,
    })
    .from(responses)
    .where(and(eq(responses.eventId, eventId), eq(responses.status, "approved")))
    .orderBy(asc(responses.createdAt), asc(responses.body))
    .all();
}

// RFC 4180. body is quoted unconditionally — participant text stays
// byte-faithful (never apostrophe-mangled for spreadsheet formula safety;
// the trade-off is stated in docs/spec.md), and quoting is the correct CSV
// answer to commas, quotes, and newlines anyway.
function csvField(value: string, forceQuote = false): string {
  const needsQuote = forceQuote || /[",\r\n]/.test(value);
  return needsQuote ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: ExportRow[]): string {
  const lines = ["body,channel,created_bucket,showcase"];
  for (const row of rows) {
    lines.push(
      [
        csvField(row.body, true),
        csvField(row.channel),
        csvField(row.created_bucket),
        row.showcase ? "true" : "false",
      ].join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}
