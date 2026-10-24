// Code entry + scan form shared by the host console and the volunteer
// screen. Both post to their own route's action.

import { useEffect, useRef, useState } from "react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ScanPanel } from "~/host/scan-panel";
import { HostSection } from "~/host/section";

// Auto-dismissing so a fresh banner reads as an event, not a static label —
// remounted (via the Form's key below) on every submit, so the timer always
// restarts clean and a new banner mid-countdown just replaces the old one.
const BANNER_TIMEOUT_MS = 4000;

function PromoteBanner({ ok, message }: { ok: boolean; message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), BANNER_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <p className={`banner ${ok ? "banner-ok" : "banner-error"}`} role="status" aria-live="polite">
      {message}
    </p>
  );
}

export function PromoteForm({
  actionData,
}: {
  actionData?: { ok: boolean; message: string; submittedAt: number };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // A scanned code fills the same field a typed one would and submits the
  // same form — promoteDraft() doesn't care where the code came from.
  function handleDecode(code: string) {
    if (codeInputRef.current) codeInputRef.current.value = code;
    formRef.current?.requestSubmit();
  }

  return (
    <HostSection title="Enter or scan a code" className="gap-4">
      <Form
        method="post"
        className="flex flex-col items-start gap-3"
        ref={formRef}
        key={actionData?.submittedAt ?? "initial"}
      >
        <div className="flex w-full flex-col gap-1.5">
          <Label htmlFor="code">Participant&rsquo;s code</Label>
          <Input
            id="code"
            name="code"
            ref={codeInputRef}
            className="code-input h-auto"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="off"
            autoFocus
          />
        </div>
        {actionData ? <PromoteBanner ok={actionData.ok} message={actionData.message} /> : null}
        <Button type="submit">Promote</Button>
      </Form>
      {/* Kept outside the keyed Form above so remounting it on every submit
          (to clear the typed input) doesn't also restart the camera stream. */}
      <ScanPanel onDecode={handleDecode} resetToken={actionData?.submittedAt} />
    </HostSection>
  );
}
