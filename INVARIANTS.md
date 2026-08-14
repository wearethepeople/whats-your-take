# Invariants — What's Your Take?

These are load-bearing rules, not preferences. When a proposed change
conflicts with one, flag the conflict — do not silently accommodate it.
Derived from the settled design in `docs/spec.md` (2026-07-19).

## I1 — No PII, no accounts, no contact capture

Participants are never asked for name, email, or phone. No field exists to
hold them. The claim "we store no PII" must survive inspection, including
infrastructure logs (no IP logging in the app layer; proxy log retention at
minimum). Admin auth is a single host account — no user management system.

This governs the submission process. A participant who later chooses, on their
own, to follow or subscribe from signage — outside the act of submitting —
does not touch this rule. The corollary: because nothing is captured at
submission, participants can never be retargeted. Every downstream connection
is opt-in pull, never push.

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
not exportable" — anything readable is copyable. But post-close, host-reviewed
is necessary, not sufficient: reviewed/approved responses become _eligible_
for publication, they are not published as each event closes. The corpus as a
whole stays sealed until the season's announced premiere (see I6's withholding
clause and I7) — publication happens at the reveal, under the
point-of-participation grant (signage/card/submit-screen: anonymous, shared
publicly, any medium). Before the reveal, public event pages carry only
aggregate counts and status, never response bodies.
(Amended 2026-08-06: superseded the "publication happens only post-close"
per-event model — see `docs/spec.md` Part II, "Publication posture," for the
prior design and the note marking it superseded.)

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

Withholding responses until a fixed, announced reveal is honest timing, not a
betrayal of this rule — the season-long wait exists so no answer is bent by
seeing the others, and the shared reveal is the payoff. What's prohibited is
withholding used as a lever on the participant: unlock-at-a-count, progress
bars, "answer to see what others said." The test is whether the withholding
serves the take or baits it.

## I7 — Complete in itself

What's Your Take is worth doing on its own terms. Participation is never
repurposed as acquisition or a growth channel, and never a conversion event.
The count is a live mirror, not a metric to grow. If an approach would extend
reach by turning a participant's honest take into a lever for something else,
name it instead of building it.
