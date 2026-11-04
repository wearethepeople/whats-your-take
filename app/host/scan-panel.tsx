// In-page camera scan for the promote console. Purely additive: manual
// code entry is the primary, spec-required fallback ("camera trouble is a
// non-event: the code is six typeable digits") — this never requests the
// camera until the host explicitly opts in, and any failure here falls
// back to that same typed input, unchanged. jsQR (not the native
// BarcodeDetector) decodes frames so this works on Safari/iPadOS too, since
// the host's device isn't guaranteed to be Chrome.

import jsQR from "jsqr";
import { CameraIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";

// Floor on how long the freeze/overlay stays up after a decode, regardless
// of how fast the promote round trip settles. A fast (e.g. local) response
// could otherwise clear the lock and resume live scanning before the host
// has moved the camera off the same code, immediately re-triggering a scan
// and flipping the UI through frozen -> live -> frozen again in a blink.
const MIN_LOCK_MS = 1984;

export function ScanPanel({
  onDecode,
  resetToken,
}: {
  onDecode: (code: string) => void;
  resetToken: unknown;
}) {
  const [scanning, setScanning] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lockedRef = useRef(false);
  const lockedAtRef = useRef<number | null>(null);

  // Re-arm scanning once the submit triggered by the last decode has
  // settled (a fresh actionData/submittedAt) — but not before MIN_LOCK_MS
  // has elapsed since the decode, so a fast round trip can't cut the
  // freeze/overlay short.
  useEffect(() => {
    const lockedAt = lockedAtRef.current;
    if (lockedAt === null) return; // this submit didn't come from a scan
    const remaining = Math.max(MIN_LOCK_MS - (Date.now() - lockedAt), 0);
    const timer = setTimeout(() => {
      lockedRef.current = false;
      lockedAtRef.current = null;
      setLocked(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [resetToken]);

  useEffect(() => {
    if (!scanning) {
      setReady(false);
      return;
    }
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;

    async function start() {
      // getUserMedia doesn't exist at all outside a secure context (https
      // or localhost) — distinct from, and comes before, any permission
      // prompt. Worth a specific message: unlike a denied/missing-camera
      // error, retrying won't help here.
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          window.isSecureContext
            ? "Camera scanning isn’t supported in this browser. Type the code below."
            : "Camera scanning needs a secure (https) connection. Type the code below.",
        );
        setScanning(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch (cause) {
        if (cancelled) return;
        const name = cause instanceof Error ? cause.name : "";
        setError(
          name === "NotAllowedError" || name === "PermissionDeniedError"
            ? "Camera permission was denied. You can still type the code below."
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? "No camera found on this device. Type the code below."
              : "Camera scanning isn’t available here. Type the code below.",
        );
        setScanning(false);
        return;
      }
      if (cancelled || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      if (cancelled) return;
      setReady(true);

      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;

      const tick = () => {
        if (cancelled) return;
        // Once locked, stop drawing entirely — the canvas keeps showing the
        // frame the code was read from (a visible "got it" freeze) instead
        // of live video, and no CPU goes to decoding until re-armed.
        if (!lockedRef.current && video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(frame.data, frame.width, frame.height);
          if (result && /^\d{6}$/.test(result.data) && !lockedRef.current) {
            lockedRef.current = true;
            lockedAtRef.current = Date.now();
            setLocked(true);
            onDecode(result.data);
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // onDecode is a stable handler from the parent; re-running this effect
    // on every render would tear down and restart the camera stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="scan-panel">
      {/* Mirrors the code row above: the camera's frame on the left, the
          button on the right. The frame is always outlined so the host knows
          where the picture will appear before turning the camera on. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="scan-frame" data-live={scanning || undefined}>
          {scanning ? (
            <>
              <video ref={videoRef} className="scan-video" autoPlay playsInline muted />
              <canvas
                ref={canvasRef}
                className={locked ? "scan-canvas scan-canvas-frozen" : "scan-canvas"}
              />
              {locked ? <div className="scan-overlay">Promoting response…</div> : null}
            </>
          ) : (
            <div className="scan-placeholder" aria-hidden="true">
              <CameraIcon className="size-6" />
              <span>Camera view</span>
            </div>
          )}
        </div>
        {/* Default (brand orange) like the console's other buttons. Sized 4:3,
            wide enough for "Starting camera…", so it reads as a tap target,
            not a bar. */}
        <Button
          type="button"
          className="h-36 w-full shrink-0 text-base sm:w-48 [&_svg:not([class*='size-'])]:size-5"
          onClick={() => {
            setError(null);
            setScanning((current) => !current);
          }}
        >
          <CameraIcon data-icon="inline-start" aria-hidden="true" />
          {!scanning ? "Scan a code" : ready ? "Stop scanning" : "Starting camera…"}
        </Button>
      </div>
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
