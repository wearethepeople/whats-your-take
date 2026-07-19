# What's Your Take? — Experience Design & Ingest Site Spec

Status: settled 2026-07-18. This document records the refined
experience design and specifies the ingest site to be built.
Companion doc: `one-pager.md` (cold-read concept document).

---

## Part I — Settled experience design

### The tent

Canopy-shaded table(s). Banner atop the canopy: **"What's your take?"**
Banner on the table front: **"We (ARE) the People"**. Warm, welcoming, unflashy.
Two **parallel stations** — no enforced path, no gating. People engage at their
comfort level, or don't (Montessori posture: prepared environment, freely chosen
work). The host's role is welcoming, not administering.

### Station A — the Guestbook

One open-ended prompt per **season** — the same question reused across
multiple events and geographies, so the corpus becomes a mirror of many
places asked one thing. A prompt *is* a season: it runs until retired. The
inaugural prompt, *"What would you remind an American in 2075?"*, is the
250th-year season — the year motivates the prompt without branding the
project (consistent with the standing principle: the 250th belongs in the
origin narrative, not the brand). Wording to be stress-tested with cold
readers at event one; "remind" is doing deliberate work but may stumble on
first read.

Three ways in, by design priority:

1. **Physical card (primary).** Card stock, decorated freely (markers, stamps,
   stickers — local art club partnerships supply the joy). Card design has a
   response-only area: no name/contact field exists anywhere. Completed cards
   drop in a bucket — private during the event, seen by no other participant
   that day. **Consent is a grant, stated at the point of participation** —
   participants hold copyright in their responses; the physical card is not
   the rights. A notice-based nonexclusive license (the PostSecret mechanism)
   is how anonymous work gets publishable. Card design, tent signage, and the
   digital submit screen all carry the grant (wordsmith at will; load-bearing
   parts are the *grant* verb, the media scope incl. print/exhibit, the
   no-names instruction, and the afterglow URL): *"All responses are
   anonymous. By submitting, you give We (ARE) the People permission to
   share, display, and publish your response in any medium — online, in
   exhibits, and in print. No names, please. See what everyone said at
   whatsyourtake.us."* Photograph the signage as displayed at each event
   (evidence of the terms participation occurred under). Attorney list:
   confirm the license language; ask about minors (disaffirmance risk before
   the book). Exhibiting the original cards likely rests on object ownership
   alone; it's reproduction that needs the license. [Not legal advice —
   confirm with counsel alongside the fiscal-sponsorship questions.]
2. **Phone (secondary).** Participant scans a QR at the table and submits on
   their own device. Presence-gated (see Part II) so the corpus provably comes
   from people at the table, not the open internet.
3. **iPad kiosk (tertiary).** Same form, on a managed device at the table.

**The photo spot:** a lit, marked place on the table where a participant can lay
their card inside a printed frame carrying the prompt and `wrtp.us` — so a photo
for socials is well-composed, self-captioning, and entirely their choice.
Sharing is opt-in and participant-initiated; the platform never publishes an
individual card.

### Station B — the Dollars

Each participant gets **three fake dollar bills** (store-bought play money,
cheap and in bulk — commercial product, so currency-reproduction compliance
is the manufacturer's problem; just verify a marker writes legibly on it
before buying a case). They free-write where they want each
dollar to go — no preset categories; the exercise's argument is agency, not
budget literacy — then staple it to the board. The filling board **is** this
station's civic mirror, live and physical. Categories emerge; nobody is polled.

Exit: a sticker and a small card pointing to **itsourmoney.us** (confirmed —
moved from .org to align with the "us" ethos) as the afterglow — where the
wish on the dollar meets where the money actually goes.

The Dollars station is **purely physical**. Nothing from it enters the ingest
site. The board is photographed for the archive; that's all.

### The tally whiteboard

A whiteboard at the tent shows the **day's running response count** — updated
at each inbox-processing pass (cards typed in + digital count from the admin
view). This is the only mid-event mirror, and deliberately so: a count leaks
no content, but it lets someone who passed in the morning see by afternoon
that participation is accumulating — volume as invitation. Content still
waits for close.

### Close of table — the synthesis

When the table closes, submissions close. All guestbook responses are digitized:

- Digital responses are already in the system.
- Physical cards are **transcribed by hand** via a batch-entry admin form
  (`channel=card`), using a **two-bucket process**: participants drop into an
  *inbox* bucket; hourly or as needed, a host empties it behind the table,
  types the cards in, and moves them to a *processed* bucket. The inbox is
  the visible backlog — close of table means "inbox empty," not a typing
  mountain. Transcription stays out of participants' view; the drop gesture
  stays private; nobody's card is read in front of them. The processed cards
  are **retained** — future traveling exhibit and coffee-table book. No AI
  transcription pipeline; if volume ever demands one, it can be added without
  schema change.

The full corpus is then AI-synthesized into **common themes + curated verbatim
quotes** (quotes anonymized, host-approved). The mirror has two layers, both
online: the synthesis (event page and/or WrTP social content — multi-panel IG
format), and beneath it the **browsable, exportable corpus of approved
responses** — the synthesis's receipts. An AI synthesis only holds if people
can see the source inputs and run their own. Nighttime building projection is
a future evolution drawing on the same archive; deliberately out of scope now.

### Assumptions

The Table tests three assumptions:
participation without identity, presence-gated submission via short-lived
codes, and publish-the-aggregate-never-the-row.

---

## Part II — Ingest site spec

### Scope & jobs to be done

The site is two apps in one skin — the public mirror and the host's
operations console. Its jobs:

1. **Explain the project** — cold visitor, festival organizer.
2. **Reveal the portrait** — the afterglow visitor ("what became of my
   card?") lands on the event's synthesis: themes, showcase panel of quotes
   and curated card images. This is the front door; the exit card is
   addressed to this person.
3. **Browse & export the corpus** — the receipts, beneath the portrait.
4. **Submit an entry** — QR/OTP-guarded, event-open only.
5. **Run the table** (host-facing) — event open/close, rotating QR / OTP
   view, card batch-entry, moderation, live count.

Guestbook only. One weekend-buildable web app that: accepts anonymous
presence-gated responses at events; gives the host an admin surface for events,
card capture, and moderation; and can export a clean corpus for synthesis.
Synthesis **pipeline** is explicitly out of scope for v1 — for event one,
synthesis is "export corpus → run through AI by hand → publish manually."
Build the pipeline after the format survives contact with a real crowd.

### Stack & disciplines

- **React Router v8** (framework mode; GA 2026-06-17 — Node 22.22+,
  React 19.2.7+, ESM-only), Fly.io, **SQLite** (WAL mode) + Drizzle ORM.
- SQLite rationale: writes are bounded by bodies at a table; the public corpus
  is read-mostly and small. Postgres adds a machine and ops surface for
  capacity this project can't generate. Consequences: **Litestream
  replication to object storage from day one** (digital responses have no
  physical backup, unlike cards), and **machine count pinned to 1** (override
  Fly's two-machine default). Drizzle keeps an eventual Postgres migration
  mechanical if ever needed.
- Scaffold: hand-rolled minimal setup, borrowing Epic Stack patterns
  selectively rather than generating from the starter (this app needs no
  user-auth system, email, or the parts previously ripped out of
  its-our-money).
- CI from first commit (lint, typecheck, test, migration check).
- Drizzle migrations from the first table.
- A few honest tests: token verification, submission validation, moderation
  state transitions.
- A short `INVARIANTS.md` at the repo root (table-site edition, below),
  imported into `CLAUDE.md` via `@INVARIANTS.md`.

### Data model

```
Prompt                                  -- a prompt IS a season: one question
  id, text, created_at,                 -- reused across events/geographies
  retired_at (nullable)                 -- until retired

Event
  id, slug, prompt_id, name, venue, address (nullable), zip, city,
  starts_at, ends_at,
  status: draft | open | closed | archived,
  created_at

Response
  id, prompt_id, event_id,
  body            text,
  channel         kiosk | site | card,
  status          pending | approved | hidden,
  showcase        boolean default false,   -- candidate for curated quotes /
                                           -- social panels
  created_at      timestamptz,             -- TRUNCATED TO THE HOUR at write;
                                           -- sub-hour submission times are
                                           -- never recorded (amended
                                           -- 2026-07-19: precision proved
                                           -- indefensible — token/OTP checks
                                           -- are current-clock, abuse counts
                                           -- live in PresenceWindow, and a
                                           -- precise time would place a row
                                           -- inside one token window,
                                           -- partially relinking code→row)
  created_bucket  text                     -- e.g. "afternoon" — the only
                                           -- time granularity ever exposed

PresenceWindow                             -- per token-rotation window:
  id, event_id, window_start, window_end,  -- count-level abuse detection only;
  submission_count                         -- never linked to any response row

Otp                                        -- host-minted fallback codes
  id, event_id, code_hash, issued_at, expires_at, redeemed_at

ShowcaseCard                               -- host-CURATED publication media:
  id, event_id, storage_key, caption,      -- a handful of standout decorated
  position, published_at                   -- cards photographed for the event
                                           -- page. NOT a transcription
                                           -- pipeline (that stays manual and
                                           -- imageless); small by design,
                                           -- reviewed like any publication.
```

No users table for participants. Admin auth is a single host account (passkey
or long random secret) — do not build user management.

**Deliberate absences:** no IP logging in the app layer (put Fly's proxy logs on
the shortest retention available and say so honestly — "we store no PII" must
survive inspection here too), no cookies on the public form beyond what the
framework strictly requires, no analytics on the submission path.

### Presence gating

The goal is provenance ("this corpus came from bodies at the table today"), not
identity. Prefer short-lived, single-use-ish, human-scale, never linkable to a person.

**Site flow — compose first, prove presence at submit:**

1. Participant reaches the form (printed URL/QR at the table — this QR is just
   the address, not a credential), writes their response. Draft persists in
   localStorage so festival connectivity can't eat it.
2. On submit, the site says: *"Use your camera to scan the host's code."* A
   button opens the camera in-page.
3. The **host shows a rotating QR** from their phone or the iPad admin view —
   a signed (HMAC, server secret) token: `event_id`, `window_start`, short TTL
   (1–2 min is fine since it's scanned at close range at the moment of
   submission). Scan attaches the token; the submission posts.
4. **OTP fallback for camera trouble:** the host view offers a manual-entry
   code (6 digits, single-use, short-lived, minted on demand). The site's
   scan screen links to "enter a code instead."
5. Server accepts submissions with a valid, unexpired token/OTP while the
   event is `open`. Per-window rate limits + anomaly eyeballing
   (`PresenceWindow` counts) rather than brittle single-use enforcement.

The host handoff is deliberate — it is the one-per-person human-judgment
channel, and a human moment. **Late upload (scan now, post when signal
returns) is deferred** — needs design discussion, not needed for months; the
truly-offline participant uses cards or the kiosk, which is the cards-primary
design working. The purpose-built LAN is rejected for v1 (suspicion cost,
captive-portal jank).

**Kiosk flow:** the iPad is provisioned once per event by the host (enter event
passcode → device holds an event-scoped session token). iPad in Guided Access,
form resets after each submission, no back-scroll through prior entries —
responses are never visible to the next participant.

**Card flow:** no gating needed — the cards were physically at the table.
A host types cards in via the admin batch-entry form (during lulls / at
close, out of participants' view) → `pending` responses with `channel=card`.
No images, no AI processing; the physical cards are the archive.

**Linkage rule (load-bearing):** the server stores nothing that links a token
or OTP to a response beyond `event_id` and coarse time. Response timestamps
are hour-truncated at write — sub-hour timing is never stored, so a row can
never be placed inside a specific token-rotation window; anything public uses
the bucket, so a response can't be correlated with photos/video of who was at
the table when.

### Admin surface

- Event CRUD + open/close. Closing an event hard-stops the submission endpoints.
- Live count (count only — the host shouldn't be reading responses mid-event
  either; the mirror waits for close).
- Card entry: batch form for typing in physical cards (`channel=card`) —
  fast keyboard flow, one card per entry, submit-and-next.
- Moderation: everything is `pending` until approved; only `approved` responses
  enter the synthesis export. `hidden` is a terminal state, not deletion —
  append-only habit.
- Corpus export: `approved` responses for an event as JSON/CSV (body, channel,
  created_bucket, showcase only).
- Showcase upload: photograph + caption + order the curated cards for the
  event page (post-close, part of the review/publish pass).

### Publication posture

**The corpus is public — honestly public.** After an event closes and the host
reviews, each event gets a public page ordered for the afterglow visitor:
the synthesis (themes) on top, then the **showcase panel** — curated
anonymized quotes and a handful of photographed standout cards
(`ShowcaseCard`) — and beneath it the full browsable corpus of `approved`
responses (`body`, `channel`, `created_bucket` — nothing else), downloadable
as JSON/CSV so anyone can run their own synthesis. Card images pass the same
review gate as text (identifying handwriting or self-identifying content
stays out); the signage's "anonymous and shared publicly" consent covers
both. The AI
synthesis only holds if people can see, and independently process, the source
inputs. Nothing-to-hide is the posture; export is a feature, not a leak.

The gates that make this compatible with the tent's intimacy:

- **Post-close only.** During the event, no one sees anyone's response — the
  submission endpoints and the public page both respect event status.
- **Approved only.** Host review precedes publication and exists to catch
  self-identifying content ("as the only beekeeper in Ellis County…"), not to
  editorialize. `hidden` responses stay in the archive, unpublished.
- **Coarse time only.** Public rows carry `created_bucket`, never timestamps.
- **Honest consent.** Signage and cards say "anonymous and shared publicly" —
  no participant discovers the corpus page as a surprise.

Participants publishing their own card photos (photo spot) remains their
choice and outside the system.

**Newsletter:** email capture exists only as a physical clipboard at the
table — a separate system that never touches this one, making
response-to-email linkage architecturally impossible. Any future digital
signup is a separate page backed by a separate service, never on the
submission path.

### INVARIANTS.md (table-site edition, draft)

1. **No PII, no accounts, no contact capture.** Participants are never asked
   for name, email, or phone. The claim "we store no PII" must survive
   inspection, including infra logs.
2. **Presence, never identity.** Tokens and OTPs prove "at the table, today."
   Nothing links a code to a response beyond event and coarse time bucket.
3. **Public means public, and consent knows it.** The approved corpus is
   browsable and exportable — never claim "viewable but not exportable";
   anything readable is copyable. Publication happens only post-close, only
   after review, and only under signage that told participants at the point
   of writing: anonymous, and shared publicly.
4. **Coarse time only — sub-hour timing is never stored.** `created_at` is
   hour-truncated at write; no public artifact exposes sub-bucket timing.
5. **Append-only moderation.** Hidden, not deleted.
6. **The process cannot betray the stated goal.** No analytics on the
   submission path, no engagement mechanics, no dark patterns.

### Build slices (weekend-ordered)

1. **Scaffold:** repo, CI, Fly app (1 machine + volume), SQLite + Drizzle,
   Litestream to object storage, first migration (Event/Prompt/Response),
   INVARIANTS.md + CLAUDE.md with import line.
2. **Submit path:** public form (kiosk + phone rendering), token verification,
   rate limits, event open/close enforcement. Tests here.
3. **Admin path:** event CRUD, OTP mint, live count, card batch-entry,
   moderation list, export.
4. **Host QR view** (rotating token QR + OTP display in the admin view) and
   the in-page camera scan on the submit screen.
5. *(Post-weekend)* Public pages: per-event page (synthesis → showcase panel
   of quotes + curated card images → corpus explorer + JSON/CSV download) and
   the **prompt-level rollup** — same question, many places, one growing
   corpus. The rollup is the season's true mirror and the projection/book
   source material. Public GETs go behind edge caching — post-close pages
   are practically static, and a cache absorbs traffic spikes (availability
   posture: a site outage never botches a table; cards are the primary mode
   and nothing physical depends on the server).

Slices 1–4 are the weekend target; a table can run on 1–4 plus a phone
camera and manual transcription, with the public page following before the
synthesis is announced.

### Open items — resolved 2026-07-19

- **Late-upload token acceptance:** cross the bridge if/when it's a blocker.
  Nothing in the schema blocks it.
- **Signage/card consent copy:** settled (see Part I) — anonymity + public
  sharing incl. exhibits/print + no-names instruction + afterglow URL.
  Final wordsmithing happens with card design.
- **Fake dollars:** store-bought play money; only remaining check is marker
  legibility on the stock.
- **Prompt:** "What would you remind an American in 2075?" is the season
  prompt, settled. (Pocket variant for read-not-asked contexts: "What do you
  want an American in 2075 to remember?")
- **Festival connectivity:** cross the bridge if/when necessary; cards need
  nothing, which is the availability posture working.
- **Projection:** future; requires nothing from this schema beyond the
  archive that already accrues.
