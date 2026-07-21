// QR rendering for the claim code: server-side generation of the module
// matrix only. The route renders it as inline SVG <rect> elements — no
// dangerouslySetInnerHTML, no client-side QR-drawing JS shipped. The QR
// payload is the bare 6-digit code (identical to what's already on screen
// as digits) — no URL, no event slug, no other data (I1/I2: this is
// presentation of already-public-on-screen data, not a new data surface).

import qrcode from "qrcode-generator";

export type QrMatrix = {
  size: number; // modules per side
  isDark: (row: number, col: number) => boolean;
};

// Type 0 = auto-detect the minimum QR version for the payload; a 6-digit
// numeric string always fits comfortably in the smallest versions.
// Error-correction "M" (~15% recovery) balances scan robustness against a
// phone camera at table distance while keeping the matrix small — a
// blocky, low-density QR is easier for jsQR to read than a dense one.
export function claimCodeQr(code: string): QrMatrix {
  if (!/^\d{6}$/.test(code)) {
    throw new Error(`claimCodeQr expects a 6-digit code, got: ${code}`);
  }
  const qr = qrcode(0, "M");
  qr.addData(code, "Numeric");
  qr.make();
  const size = qr.getModuleCount();
  return {
    size,
    isDark: (row, col) => qr.isDark(row, col),
  };
}
