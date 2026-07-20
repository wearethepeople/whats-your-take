export function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    String((cause as { code: unknown }).code).startsWith("SQLITE_CONSTRAINT")
  );
}
