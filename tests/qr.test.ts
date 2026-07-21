import { expect, test } from "vitest";
import { claimCodeQr } from "~/submissions/qr.server";

function darkCount(qr: ReturnType<typeof claimCodeQr>): number {
  let count = 0;
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (qr.isDark(row, col)) count++;
    }
  }
  return count;
}

test("encoding a 6-digit code produces a non-empty, non-full square matrix", () => {
  const qr = claimCodeQr("042817");
  expect(qr.size).toBeGreaterThan(0);
  const count = darkCount(qr);
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(qr.size * qr.size);
});

test("the same code always encodes to the same matrix", () => {
  const a = claimCodeQr("042817");
  const b = claimCodeQr("042817");
  expect(a.size).toBe(b.size);
  for (let row = 0; row < a.size; row++) {
    for (let col = 0; col < a.size; col++) {
      expect(a.isDark(row, col)).toBe(b.isDark(row, col));
    }
  }
});

test("different codes encode to different matrices", () => {
  const a = claimCodeQr("000000");
  const b = claimCodeQr("999999");
  let same = a.size === b.size;
  for (let row = 0; row < a.size && same; row++) {
    for (let col = 0; col < a.size; col++) {
      if (a.isDark(row, col) !== b.isDark(row, col)) {
        same = false;
        break;
      }
    }
  }
  expect(same).toBe(false);
});

test("rejects non-6-digit input", () => {
  expect(() => claimCodeQr("12345")).toThrow();
  expect(() => claimCodeQr("1234567")).toThrow();
  expect(() => claimCodeQr("12a456")).toThrow();
  expect(() => claimCodeQr("")).toThrow();
});

test("boundary codes (leading zeros, all same digit) encode without error", () => {
  expect(() => claimCodeQr("000000")).not.toThrow();
  expect(() => claimCodeQr("999999")).not.toThrow();
});
