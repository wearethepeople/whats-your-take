# Invariants — What's Your Take?

These are load-bearing rules, not preferences. When a proposed change
conflicts with one, flag the conflict — do not silently accommodate it.
Derived from the settled design in `docs/spec.md` (2026-07-19).

## I1 — No PII, no accounts, no contact capture

Participants are never asked for name, email, or phone. No field exists to
hold them. The claim "we store no PII" must survive inspection, including
infrastructure logs (no IP logging in the app layer; proxy log retention at
minimum). Admin auth is a single host account — no user management system.

## I2 — Presence, never identity

The claim-code handshake proves "at the table, today" — nothing more. A
response enters the corpus only when the host promotes a participant's
staged draft by its short-lived code; nothing in the database links a code
to a response beyond `event_id` and the coarse time bucket. At promotion the
staged row's body is nulled, and staged rows are swept after expiry.
`PresenceWindow` holds counts, never row references.
(Amended 2026-07-19: flow reversed from host-displayed rotating tokens +
OTP fallback — host promotion replaced every public write path into the
corpus, and the token/OTP machinery was deleted.)

## I3 — Public means public, and consent knows it

The approved corpus is browsable and exportable. Never claim "viewable but
not exportable" — anything readable is copyable. Publication happens only
post-close, only after host review, and only under the point-of-participation
grant (signage/card/submit-screen: anonymous, shared publicly, any medium).

## I4 — Coarse time only; sub-hour timing is never stored

`created_at` is truncated to the hour at write time — sub-hour submission
timing does not exist anywhere, so a response can never be placed inside a
specific staging window (see I2). Every public surface — pages,
exports, API responses — carries `created_bucket` only, so no response can
be correlated with photos or video of who was at the table when.
(Amended 2026-07-19 from "precise time internal": full precision proved to
serve no validation or abuse-detection need.)

## I5 — Append-only moderation

Responses are `pending` until approved. `hidden` is a terminal state, not
deletion. Nothing is destroyed; only `approved` rows reach any public surface
or export.

## I6 — The process cannot betray the stated goal

No analytics on the submission path, no engagement mechanics, no dark
patterns. Responses are never shown to other participants mid-event (count
is the only live mirror). If an approach would be effective but corrosive,
name it instead of building it.
