# What's Your Take? — ingest site

Anonymous, presence-gated response collection for the What's Your Take table
(We (ARE) the People). Participants at a physical table answer one open-ended
prompt per season; the site ingests digital and transcribed-card responses,
and after each event publishes a synthesis + browsable corpus. Full design:
`docs/spec.md`. This file + INVARIANTS.md are the working contract.

@INVARIANTS.md

## Stack

- React Router v8, framework mode (Node 22.22+, React 19.2.7+, ESM-only)
- SQLite (WAL mode) + Drizzle ORM — single Fly.io machine (count pinned to 1)
  with a volume; Litestream replication to object storage (pin a version
  outside the v0.5.6–v0.5.7 silent-failure range; test restore before event
  one)
- Hand-rolled minimal scaffold; borrow Epic Stack patterns selectively, do
  not generate from the starter

## Disciplines

- CI from first commit: lint, typecheck, test, migration check
- Drizzle migrations from the first table; schema lives in `docs/spec.md`
  Part II and changes land there first
- Tests where the risk is: token/OTP verification, submission validation,
  moderation state transitions, event open/close enforcement
- Build in slices (`docs/spec.md` Part II, "Build slices"); one slice per
  session; weekend target is slices 1–4

## Jobs the site does

Explain the project · reveal the portrait (synthesis — afterglow visitor's
front door) · browse/export the corpus · submit an entry (QR/OTP-gated,
event-open only) · run the table (host console)

## Never do

- Add a field, log, or join that could identify a participant (I1, I2)
- Store sub-hour timestamps anywhere; public surfaces carry
  `created_bucket` only (I4)
- Show responses to participants mid-event; count is the only live mirror (I7)
- Claim data is viewable but not exportable (I3)
- Delete responses; `hidden` is terminal, append-only (I5)
- Share code or schema with Consensus, in either direction (I6)
- Add analytics or engagement mechanics to the submission path (I7)
