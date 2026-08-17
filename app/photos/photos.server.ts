// Event venue-photo gallery: DB access + upload orchestration. Visibility
// is governed entirely by eventPhotoGalleries.publishedAt plus the parent
// event being sealed (see eventDetail() in
// app/features/events/services/season.server.ts) — no per-photo
// moderation, the host is trusted.

import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { eventPhotoGalleries, eventPhotos } from "~/db/schema.server";
import type { Db } from "~/db/types.server";
import { deletePhoto, EVENT_PHOTOS_PREFIX, putPhoto } from "./storage.server";
import { makeThumbnail, stripExif } from "./thumbnail.server";

export const MAX_PHOTOS_PER_EVENT = 40;
export const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type EventPhotoRow = typeof eventPhotos.$inferSelect;

export function listEventPhotos(db: Db, eventId: number): EventPhotoRow[] {
  return db
    .select()
    .from(eventPhotos)
    .where(eq(eventPhotos.eventId, eventId))
    .orderBy(asc(eventPhotos.position))
    .all();
}

export function galleryPublishedAt(db: Db, eventId: number): Date | null {
  const row = db
    .select({ publishedAt: eventPhotoGalleries.publishedAt })
    .from(eventPhotoGalleries)
    .where(eq(eventPhotoGalleries.eventId, eventId))
    .get();
  return row?.publishedAt ?? null;
}

function setGalleryPublishedAt(db: Db, eventId: number, publishedAt: Date | null): void {
  db.insert(eventPhotoGalleries)
    .values({ eventId, publishedAt })
    .onConflictDoUpdate({ target: eventPhotoGalleries.eventId, set: { publishedAt } })
    .run();
}

export function publishGallery(db: Db, eventId: number): void {
  setGalleryPublishedAt(db, eventId, new Date());
}

export function unpublishGallery(db: Db, eventId: number): void {
  setGalleryPublishedAt(db, eventId, null);
}

export function updateCaption(db: Db, id: number, caption: string): void {
  db.update(eventPhotos)
    .set({ caption: caption.trim() || null })
    .where(eq(eventPhotos.id, id))
    .run();
}

// Swaps this photo's position with its immediate up/down neighbor within
// the same event. No-op at either end of the list.
export function movePhoto(db: Db, eventId: number, id: number, direction: "up" | "down"): void {
  const photo = db.select().from(eventPhotos).where(eq(eventPhotos.id, id)).get();
  if (!photo || photo.eventId !== eventId) return;

  const neighbor =
    direction === "up"
      ? db
          .select()
          .from(eventPhotos)
          .where(and(eq(eventPhotos.eventId, eventId), lt(eventPhotos.position, photo.position)))
          .orderBy(sql`${eventPhotos.position} desc`)
          .get()
      : db
          .select()
          .from(eventPhotos)
          .where(and(eq(eventPhotos.eventId, eventId), gt(eventPhotos.position, photo.position)))
          .orderBy(asc(eventPhotos.position))
          .get();
  if (!neighbor) return;

  db.transaction((tx) => {
    tx.update(eventPhotos)
      .set({ position: neighbor.position })
      .where(eq(eventPhotos.id, photo.id))
      .run();
    tx.update(eventPhotos)
      .set({ position: photo.position })
      .where(eq(eventPhotos.id, neighbor.id))
      .run();
  });
}

// Best-effort storage cleanup: the DB row is removed even if the S3
// deletes fail (see storage.server.ts's deletePhoto doc comment) — no
// compliance/cost driver here requires guaranteed cleanup of an orphaned
// object in a cheap object store.
export async function deleteEventPhoto(db: Db, id: number): Promise<void> {
  const photo = db.select().from(eventPhotos).where(eq(eventPhotos.id, id)).get();
  if (!photo) return;
  await Promise.allSettled([deletePhoto(photo.storageKey), deletePhoto(photo.thumbnailKey)]);
  db.delete(eventPhotos).where(eq(eventPhotos.id, id)).run();
}

export type PhotoUpload = { buffer: Buffer; contentType: string };

export type UploadValidationError = { ok: false; message: string };

// Validates a whole batch before any upload work starts, so a submit
// either fully succeeds or fails with one clear message — no partial
// uploads to reconcile.
export function validateUpload(
  db: Db,
  eventId: number,
  uploads: PhotoUpload[],
): UploadValidationError | undefined {
  if (uploads.length === 0) return { ok: false, message: "Choose at least one photo." };

  const existingCount = db
    .select({ id: eventPhotos.id })
    .from(eventPhotos)
    .where(eq(eventPhotos.eventId, eventId))
    .all().length;
  if (existingCount + uploads.length > MAX_PHOTOS_PER_EVENT) {
    return { ok: false, message: `An event can hold at most ${MAX_PHOTOS_PER_EVENT} photos.` };
  }

  for (const upload of uploads) {
    if (!(upload.contentType in EXTENSION_BY_CONTENT_TYPE)) {
      return { ok: false, message: "Photos must be JPEG, PNG, or WebP." };
    }
    if (upload.buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        message: `Each photo must be under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
      };
    }
  }
  return undefined;
}

// Thumbnails + strips EXIF, uploads original and thumbnail, inserts one
// row per upload. Caller must have already validated the batch.
export async function uploadEventPhotos(
  db: Db,
  eventId: number,
  uploads: PhotoUpload[],
): Promise<void> {
  const maxPosition = db
    .select({ position: eventPhotos.position })
    .from(eventPhotos)
    .where(eq(eventPhotos.eventId, eventId))
    .orderBy(sql`${eventPhotos.position} desc`)
    .get();
  let nextPosition = (maxPosition?.position ?? 0) + 1;

  for (const upload of uploads) {
    const extension = EXTENSION_BY_CONTENT_TYPE[upload.contentType];
    const [original, thumbnail] = await Promise.all([
      stripExif(upload.buffer),
      makeThumbnail(upload.buffer),
    ]);

    const row = db
      .insert(eventPhotos)
      .values({
        eventId,
        // Placeholder keys until the row's real id is known — replaced
        // below once inserted, since the key scheme includes the photo id.
        storageKey: "",
        thumbnailKey: "",
        contentType: upload.contentType,
        position: nextPosition,
      })
      .returning()
      .get();
    nextPosition += 1;

    const storageKey = `${EVENT_PHOTOS_PREFIX}${eventId}/${row.id}-original.${extension}`;
    const thumbnailKey = `${EVENT_PHOTOS_PREFIX}${eventId}/${row.id}-thumb.${extension}`;

    await Promise.all([
      putPhoto(storageKey, original, upload.contentType),
      putPhoto(thumbnailKey, thumbnail, upload.contentType),
    ]);

    db.update(eventPhotos)
      .set({ storageKey, thumbnailKey })
      .where(eq(eventPhotos.id, row.id))
      .run();
  }
}
