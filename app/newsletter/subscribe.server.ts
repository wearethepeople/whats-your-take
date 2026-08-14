const EMMA_API_BASE = "https://api.e2ma.net";
const EMMA_GROUP_ID = 71250872;

function emmaCredentials() {
  const accountId = process.env.EMMA_ACCOUNT_ID;
  const publicKey = process.env.EMMA_PUBLIC_KEY;
  const privateKey = process.env.EMMA_PRIVATE_KEY;

  if (!accountId || !publicKey || !privateKey) {
    throw new Error(
      "Emma is not configured: set EMMA_ACCOUNT_ID, EMMA_PUBLIC_KEY, and EMMA_PRIVATE_KEY.",
    );
  }

  return { accountId, publicKey, privateKey };
}

export async function subscribe(email: string): Promise<void> {
  const { accountId, publicKey, privateKey } = emmaCredentials();

  const response = await fetch(`${EMMA_API_BASE}/${accountId}/members/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${publicKey}:${privateKey}`).toString("base64")}`,
    },
    body: JSON.stringify({
      email,
      group_ids: [EMMA_GROUP_ID],
      subscriber_consent_tracking: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Emma subscribe failed (${response.status}): ${body}`);
  }
}
