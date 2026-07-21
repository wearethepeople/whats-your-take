// The public submit path. This route only STAGES drafts — nothing here can
// write into the corpus (promotion is the host's authenticated act). No
// cookies, no analytics, no logging of bodies or anything request-identifying
// (I1/I6). The only per-participant state is their own draft, kept in their
// own browser's localStorage.

import { useCallback, useEffect, useRef, useState } from "react";
import { data, Form, Link, useNavigate } from "react-router";
import type { Route } from "./+types/e.$slug";
import { db } from "~/db/client.server";
import { events, prompts } from "~/db/schema.server";
import { eq } from "drizzle-orm";
import { claimCodeQr } from "~/submissions/qr.server";
import { MAX_BODY_LENGTH } from "~/submissions/constants";
import { stageDraft } from "~/submissions/stage.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData ? `${loaderData.eventName} — What's Your Take?` : "What's Your Take?" },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const row = db
    .select({
      eventName: events.name,
      status: events.status,
      promptText: prompts.text,
    })
    .from(events)
    .innerJoin(prompts, eq(events.promptId, prompts.id))
    .where(eq(events.slug, params.slug))
    .get();
  if (!row || row.status === "draft") throw data(null, { status: 404 });
  const url = new URL(request.url);
  return {
    slug: params.slug,
    eventName: row.eventName,
    promptText: row.promptText,
    open: row.status === "open",
    kiosk: url.searchParams.has("kiosk"),
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const form = await request.formData();
  const body = form.get("body");
  const result = stageDraft(db, { slug: params.slug, body, now: new Date() });
  if (result.ok) {
    // Flatten the matrix: the closure-based isDark() can't survive the
    // action -> actionData JSON round trip.
    const qr = claimCodeQr(result.claimCode);
    const qrModules = Array.from({ length: qr.size }, (_row, row) =>
      Array.from({ length: qr.size }, (_col, col) => qr.isDark(row, col)),
    );
    return { staged: { claimCode: result.claimCode, qrModules } };
  }
  // Echo the body back so a no-JS round trip never loses the writing.
  return {
    error: result.message,
    body: typeof body === "string" ? body : "",
  };
}

function draftKey(slug: string): string {
  return `wyt-draft:${slug}`;
}

// Kiosk idle deadlines before the "Still there?" warning appears. The code
// screen gets longer: resetting it destroys the only copy of the claim code
// (the kiosk never touches localStorage) and the participant may be in the
// host's line. 5 min still turns the screen over inside the 15-min TTL.
const KIOSK_IDLE_COMPOSE_MS = 2 * 60 * 1000;
const KIOSK_IDLE_CODE_MS = 5 * 60 * 1000;
const IDLE_WARNING_SECONDS = 10;

// React 19 hoists these into <head>; the RR static links export can't see
// the slug. The manifest bakes the kiosk start URL for add-to-home-screen.
function ManifestTags({ slug }: { slug: string }) {
  return (
    <>
      <link rel="manifest" href={`/e/${slug}/manifest.webmanifest`} />
      <meta name="apple-mobile-web-app-capable" content="yes" />
    </>
  );
}

// Two-stage kiosk idle reset: after idleMs without interaction, show a
// countdown warning with a keep-working button; only if that expires does
// onReset fire. Any interaction (the button included — pointerdown/keydown
// land on window first) re-arms the idle timer. Never rendered off-kiosk.
function IdleResetGuard({
  enabled,
  idleMs,
  onReset,
}: {
  enabled: boolean;
  idleMs: number;
  onReset: () => void;
}) {
  const [warning, setWarning] = useState(false);
  const [remaining, setRemaining] = useState(IDLE_WARNING_SECONDS);
  const armRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      setWarning(false);
      setRemaining(IDLE_WARNING_SECONDS);
      timer = setTimeout(() => setWarning(true), idleMs);
    };
    armRef.current = arm;
    arm();
    const activity = ["pointerdown", "touchstart", "keydown"] as const;
    for (const name of activity) window.addEventListener(name, arm);
    return () => {
      clearTimeout(timer);
      for (const name of activity) window.removeEventListener(name, arm);
    };
  }, [enabled, idleMs]);

  useEffect(() => {
    if (!warning) return;
    const tick = setInterval(() => setRemaining((seconds) => seconds - 1), 1000);
    return () => clearInterval(tick);
  }, [warning]);

  useEffect(() => {
    if (!warning || remaining > 0) return;
    // Re-arm before resetting: clears the banner and starts a fresh idle
    // cycle for the next participant (and keeps this effect from re-firing).
    armRef.current();
    onReset();
  }, [warning, remaining, onReset]);

  if (!warning) return null;
  return (
    <div className="banner banner-warn idle-warning" role="alertdialog" aria-live="assertive">
      <p>Still there? The form resets in {Math.max(remaining, 0)}…</p>
      <button type="button" onClick={() => armRef.current()}>
        Keep working
      </button>
    </div>
  );
}

export default function EventSubmit({ loaderData, actionData }: Route.ComponentProps) {
  const { slug, eventName, promptText, open, kiosk } = loaderData;
  const navigate = useNavigate();
  const [resetEpoch, setResetEpoch] = useState(0);
  const formUrl = kiosk ? `/e/${slug}?kiosk=1` : `/e/${slug}`;

  // Idle reset for abandoned kiosk screens: remount the compose form (the
  // key drops typed-but-abandoned text) and replace-navigate so a lingering
  // code screen clears — the same mechanism as the post-promotion reset.
  const handleIdleReset = useCallback(() => {
    setResetEpoch((epoch) => epoch + 1);
    navigate(formUrl, { replace: true });
  }, [navigate, formUrl]);

  if (!open) {
    return (
      <main className={kiosk ? "container kiosk" : "container"}>
        <ManifestTags slug={slug} />
        <h1>{eventName}</h1>
        <p>
          This table has closed. After the host&rsquo;s review, everything said here — the portrait
          and the full corpus — will be public on this site.
        </p>
      </main>
    );
  }

  const staged = actionData && "staged" in actionData ? actionData.staged : undefined;
  if (staged) {
    return (
      <main className={kiosk ? "container kiosk" : "container"}>
        <ManifestTags slug={slug} />
        <CodeScreen
          slug={slug}
          kiosk={kiosk}
          claimCode={staged.claimCode}
          qrModules={staged.qrModules}
          onIdleReset={handleIdleReset}
        />
      </main>
    );
  }

  return (
    <main className={kiosk ? "container kiosk" : "container"}>
      <ManifestTags slug={slug} />
      <IdleResetGuard enabled={kiosk} idleMs={KIOSK_IDLE_COMPOSE_MS} onReset={handleIdleReset} />
      <ComposeForm
        key={resetEpoch}
        slug={slug}
        kiosk={kiosk}
        promptText={promptText}
        initialBody={(actionData && "body" in actionData ? actionData.body : "") ?? ""}
        error={(actionData && "error" in actionData ? actionData.error : null) ?? null}
      />
    </main>
  );
}

function ComposeForm({
  slug,
  kiosk,
  promptText,
  initialBody,
  error,
}: {
  slug: string;
  kiosk: boolean;
  promptText: string;
  initialBody: string;
  error: string | null;
}) {
  const [body, setBody] = useState(initialBody);

  // Restore an in-progress draft (festival connectivity can't eat it); keep
  // it saved as they type. JS-only enhancement — without JS the form still
  // works, it just doesn't survive a page reload. Never on the kiosk: the
  // device is shared, and no participant may surface another's writing.
  useEffect(() => {
    if (kiosk) return;
    if (body === "") {
      try {
        const saved = localStorage.getItem(draftKey(slug));
        if (saved) setBody(saved);
      } catch {
        // Private-mode storage failures are fine; the form still works.
      }
    }
    // Restore once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(value: string) {
    setBody(value);
    if (kiosk) return;
    try {
      if (value) localStorage.setItem(draftKey(slug), value);
      else localStorage.removeItem(draftKey(slug));
    } catch {
      // Ignore storage failures.
    }
  }

  return (
    <>
      <h1>{promptText}</h1>
      <Form
        method="post"
        action={kiosk ? `/e/${slug}?kiosk=1` : `/e/${slug}`}
        replace
        className="stack"
      >
        <label htmlFor="body" className="visually-hidden">
          Your take
        </label>
        <textarea
          id="body"
          name="body"
          value={body}
          onChange={(event) => handleChange(event.target.value)}
          maxLength={MAX_BODY_LENGTH}
          rows={kiosk ? 8 : 6}
          placeholder="Your take…"
        />
        {error ? (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="consent">
          All responses are anonymous. By submitting, you give We (ARE) the People permission to
          share, display, and publish your response in any medium — online, in exhibits, and in
          print. No names, please.
        </p>
        <button type="submit">Submit</button>
      </Form>
    </>
  );
}

function ClaimCodeQr({ modules }: { modules: boolean[][] }) {
  const size = modules.length;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="claim-qr"
      role="img"
      aria-label="Scannable QR version of your claim code"
    >
      <rect width={size} height={size} fill="white" />
      {modules.flatMap((row, r) =>
        row.map((dark, c) =>
          dark ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="black" /> : null,
        ),
      )}
    </svg>
  );
}

function CodeScreen({
  slug,
  kiosk,
  claimCode,
  qrModules,
  onIdleReset,
}: {
  slug: string;
  kiosk: boolean;
  claimCode: string;
  qrModules: boolean[][];
  onIdleReset: () => void;
}) {
  const [status, setStatus] = useState<"waiting" | "promoted" | "gone">("waiting");
  const navigate = useNavigate();
  const formUrl = kiosk ? `/e/${slug}?kiosk=1` : `/e/${slug}`;

  useEffect(() => {
    if (status !== "waiting") return;
    const id = setInterval(async () => {
      try {
        const response = await fetch(`/e/${slug}/status/${claimCode}`);
        if (!response.ok) return;
        const json = (await response.json()) as { status: "waiting" | "promoted" | "gone" };
        if (json.status !== "waiting") setStatus(json.status);
      } catch {
        // Offline blips: keep polling.
      }
    }, 3000);
    return () => clearInterval(id);
  }, [status, slug, claimCode]);

  useEffect(() => {
    if (status !== "promoted") return;
    if (!kiosk) {
      try {
        localStorage.removeItem(draftKey(slug));
      } catch {
        // Ignore storage failures.
      }
    }
    if (kiosk) {
      // Reset for the next participant; replace-navigation means no
      // back-scroll into this one's session.
      const timer = setTimeout(() => navigate(formUrl, { replace: true }), 6000);
      return () => clearTimeout(timer);
    }
  }, [status, kiosk, slug, formUrl, navigate]);

  // Promoted resets itself in 6s; waiting gets the long idle deadline (a
  // reset destroys the only copy of the code), gone the short one.
  const idleGuard =
    status === "promoted" ? null : (
      <IdleResetGuard
        enabled={kiosk}
        idleMs={status === "waiting" ? KIOSK_IDLE_CODE_MS : KIOSK_IDLE_COMPOSE_MS}
        onReset={onIdleReset}
      />
    );

  if (status === "promoted") {
    return (
      <>
        <h1>It&rsquo;s in the book.</h1>
        <p>
          Thanks — your take joins the day&rsquo;s corpus. After the table closes and the host
          reviews, see what everyone said at whatsyourtake.us.
        </p>
        <Link to={formUrl} replace>
          Write another
        </Link>
      </>
    );
  }

  if (status === "gone") {
    return (
      <>
        {idleGuard}
        <h1>That code expired.</h1>
        {kiosk ? (
          <p>Head back and submit again — the host is right there.</p>
        ) : (
          <p>Your draft is still saved on this device — head back and resubmit for a fresh code.</p>
        )}
        <Link to={formUrl} replace>
          {kiosk ? "Back to the form" : "Back to your draft"}
        </Link>
      </>
    );
  }

  return (
    <>
      {idleGuard}
      <h1>Show this to the host</h1>
      <ClaimCodeQr modules={qrModules} />
      <p className="claim-code" aria-label="Your claim code">
        {claimCode}
      </p>
      <p>
        The host enters this code to put your take in the book. It expires in 15 minutes
        {kiosk ? "." : "; your draft stays saved on this device."}
      </p>
      <Link to={formUrl} replace>
        Back to the form
      </Link>
    </>
  );
}
