// Host-console configuration. ADMIN_PASSWORD and SESSION_SECRET are required —
// there is no dev fallback on purpose: a silent default would eventually guard
// production. VOLUNTEER_PASSWORD is optional: unset simply means volunteer
// access is off.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. For dev: add it to .env (see .env.example). ` +
        `For production: fly secrets set ${name}=...`,
    );
  }
  return value;
}

export function adminPassword(): string {
  return required("ADMIN_PASSWORD");
}

export function sessionSecret(): string {
  return required("SESSION_SECRET");
}

export function volunteerPassword(): string | null {
  return process.env.VOLUNTEER_PASSWORD || null;
}
