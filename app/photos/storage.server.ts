// Tigris object storage (Fly's own blob storage; implements the S3 API for
// compatibility with S3 tooling like this client — no AWS involvement).
// The Litestream SQLite replica lives at the bucket-root key "sqlite.db"
// (see other/litestream.yml) — this prefix keeps event photos from ever
// colliding with it.

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { bucketName, s3AccessKeyId, s3Endpoint, s3SecretAccessKey } from "./env.server";

export const EVENT_PHOTOS_PREFIX = "event-photos/";

let client: S3Client | undefined;

function s3(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: s3Endpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: s3AccessKeyId(),
      secretAccessKey: s3SecretAccessKey(),
    },
  });
  return client;
}

export async function putPhoto(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3().send(
    new PutObjectCommand({ Bucket: bucketName(), Key: key, Body: body, ContentType: contentType }),
  );
}

// Returns the object body as a Buffer plus its stored content type, or
// undefined if the key doesn't exist.
export async function getPhoto(
  key: string,
): Promise<{ body: Buffer; contentType: string } | undefined> {
  try {
    const result = await s3().send(new GetObjectCommand({ Bucket: bucketName(), Key: key }));
    if (!result.Body) return undefined;
    const body = Buffer.from(await result.Body.transformToByteArray());
    return { body, contentType: result.ContentType ?? "application/octet-stream" };
  } catch (error) {
    if (error instanceof Error && error.name === "NoSuchKey") return undefined;
    throw error;
  }
}

// Best-effort: callers should not block a host's delete action on this
// succeeding (see photos.server.ts's deleteEventPhoto).
export async function deletePhoto(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}
