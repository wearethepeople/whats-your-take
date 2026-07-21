// In-page camera scan for the promote console. Purely additive: manual
// code entry is the primary, spec-required fallback ("camera trouble is a
// non-event: the code is six typeable digits") — this never requests the
// camera until the host explicitly opts in, and any failure here falls
// back to that same typed input, unchanged. jsQR (not the native
// BarcodeDetector) decodes frames so this works on Safari/iPadOS too, since
// the host's device isn't guaranteed to be Chrome.

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lockedRef = useRef(false);

  // Re-arm scanning once the submit triggered by the last decode has
  // settled (a fresh actionData/submittedAt), rather than on a timer.
  useEffect(() => {
    lockedRef.current = false;
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
            ? "Camera scanning isn't supported in this browser — type the code below."
            : "Camera scanning needs a secure (https) connection — type the code below.",
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
            ? "Camera permission was denied — you can still type the code below."
            : name === "NotFoundError" || name === "DevicesNotFoundError"
              ? "No camera found on this device — type the code below."
              : "Camera scanning isn't available here — type the code below.",
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
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(frame.data, frame.width, frame.height);
          if (result && /^\d{6}$/.test(result.data) && !lockedRef.current) {
            lockedRef.current = true;
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
      <button
        type="button"
        onClick={() => {
          setError(null);
          setScanning((current) => !current);
        }}
      >
        {!scanning ? "Scan a code" : ready ? "Stop scanning" : "Starting camera…"}
      </button>
      {error ? (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      ) : null}
      {scanning ? (
        <>
          <video ref={videoRef} className="scan-video" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="scan-canvas" />
        </>
      ) : null}
    </div>
  );
}
