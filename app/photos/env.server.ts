// Tigris (S3-protocol) object storage configuration. Required — no dev
// fallback on purpose, same posture as app/host/env.server.ts.

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

export function bucketName(): string {
  return required("BUCKET_NAME");
}

export function s3AccessKeyId(): string {
  return required("AWS_ACCESS_KEY_ID");
}

export function s3SecretAccessKey(): string {
  return required("AWS_SECRET_ACCESS_KEY");
}

export function s3Endpoint(): string {
  return required("AWS_ENDPOINT_URL_S3");
}
