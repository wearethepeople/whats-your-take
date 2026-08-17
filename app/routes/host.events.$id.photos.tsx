// Host console: upload, caption, reorder, and publish an event's venue-
// photo gallery. Auth is handled by the host layout's middleware (see
// routes/layouts/host.tsx) — no requireHost call needed here.

import { data, Form, Link } from "react-router";
import type { Route } from "./+types/host.events.$id.photos";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { db } from "~/db/client.server";
import { getEvent } from "~/features/events/services/lifecycle.server";
import { HostSection } from "~/host/section";
import {
  deleteEventPhoto,
  galleryPublishedAt,
  listEventPhotos,
  movePhoto,
  publishGallery,
  unpublishGallery,
  updateCaption,
  uploadEventPhotos,
  validateUpload,
  type PhotoUpload,
} from "~/photos/photos.server";
import { EVENT_PHOTOS_PREFIX } from "~/photos/storage.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Photos · ${loaderData?.event.name ?? "Event"} · What’s Your Take?` }];
}

export async function loader({ params }: Route.LoaderArgs) {
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  return {
    event: { id: event.id, name: event.name, status: event.status },
    photos: listEventPhotos(db, event.id).map((photo) => ({
      id: photo.id,
      caption: photo.caption,
      thumbnailUrl: "/photos/" + photo.thumbnailKey.slice(EVENT_PHOTOS_PREFIX.length),
    })),
    publishedAt: galleryPublishedAt(db, event.id),
  };
}

async function readUploads(form: FormData): Promise<PhotoUpload[]> {
  const uploads: PhotoUpload[] = [];
  for (const entry of form.getAll("photos")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    uploads.push({ buffer: Buffer.from(await entry.arrayBuffer()), contentType: entry.type });
  }
  return uploads;
}

export async function action({ request, params }: Route.ActionArgs) {
  const event = getEvent(db, Number(params.id));
  if (!event) throw data(null, { status: 404 });
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  switch (intent) {
    case "upload": {
      const uploads = await readUploads(form);
      const error = validateUpload(db, event.id, uploads);
      if (error) return error;
      await uploadEventPhotos(db, event.id, uploads);
      return { ok: true as const, message: `Uploaded ${uploads.length} photo(s).` };
    }
    case "caption": {
      updateCaption(db, Number(form.get("id")), String(form.get("caption") ?? ""));
      return { ok: true as const, message: "Caption saved." };
    }
    case "move": {
      const direction = form.get("direction");
      if (direction !== "up" && direction !== "down") {
        return { ok: false as const, message: "Unknown direction." };
      }
      movePhoto(db, event.id, Number(form.get("id")), direction);
      return { ok: true as const, message: "Reordered." };
    }
    case "publish": {
      publishGallery(db, event.id);
      return { ok: true as const, message: "Gallery published." };
    }
    case "unpublish": {
      unpublishGallery(db, event.id);
      return { ok: true as const, message: "Gallery unpublished." };
    }
    case "delete": {
      await deleteEventPhoto(db, Number(form.get("id")));
      return { ok: true as const, message: "Deleted." };
    }
    default:
      return { ok: false as const, message: "Unknown action." };
  }
}

export default function HostEventPhotos({ loaderData, actionData }: Route.ComponentProps) {
  const { event, photos, publishedAt } = loaderData;
  return (
    <>
      <h1 className="mt-4 mb-2 text-2xl font-semibold">Photos · {event.name}</h1>
      <p className="mb-4">
        <Link to={`/host/events/${event.id}`} className="text-primary underline underline-offset-4">
          Back to the event
        </Link>
      </p>

      {actionData ? (
        <p
          className={`banner mb-4 ${actionData.ok ? "banner-ok" : "banner-error"}`}
          role="status"
          aria-live="polite"
        >
          {actionData.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <HostSection title="Publish">
          <p className="text-sm text-muted-foreground">
            {publishedAt
              ? `Published ${publishedAt.toLocaleDateString()}. Visible on the public event page once the event is closed or archived.`
              : "Draft — not visible on the public page yet."}
          </p>
          <Form method="post">
            <input type="hidden" name="intent" value={publishedAt ? "unpublish" : "publish"} />
            <Button type="submit" variant={publishedAt ? "outline" : "default"}>
              {publishedAt ? "Unpublish" : "Publish gallery"}
            </Button>
          </Form>
        </HostSection>

        <HostSection title="Upload photos">
          <Form
            method="post"
            encType="multipart/form-data"
            className="flex flex-col items-start gap-3"
          >
            <input type="hidden" name="intent" value="upload" />
            <input
              type="file"
              name="photos"
              multiple
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <Button type="submit">Upload</Button>
          </Form>
        </HostSection>

        <HostSection title={`Photos (${photos.length})`}>
          {photos.length === 0 ? (
            <p className="text-muted-foreground">None yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <li key={photo.id} className="flex flex-col gap-2">
                  <img
                    src={photo.thumbnailUrl}
                    alt={photo.caption ?? ""}
                    className="aspect-square w-full rounded border border-border object-cover"
                  />
                  <Form method="post" className="flex gap-1">
                    <input type="hidden" name="intent" value="caption" />
                    <input type="hidden" name="id" value={photo.id} />
                    <Input
                      name="caption"
                      defaultValue={photo.caption ?? ""}
                      placeholder="Caption (optional)"
                      className="text-sm"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Save
                    </Button>
                  </Form>
                  <div className="flex gap-1">
                    <Form method="post">
                      <input type="hidden" name="intent" value="move" />
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button type="submit" size="sm" variant="outline" disabled={index === 0}>
                        Up
                      </Button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="intent" value="move" />
                      <input type="hidden" name="id" value={photo.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={index === photos.length - 1}
                      >
                        Down
                      </Button>
                    </Form>
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="id" value={photo.id} />
                      <Button type="submit" size="sm" variant="destructive">
                        Delete
                      </Button>
                    </Form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </HostSection>
      </div>
    </>
  );
}
