import sharp from "sharp";

const THUMBNAIL_WIDTH = 480;

export async function makeThumbnail(original: Buffer): Promise<Buffer> {
  return sharp(original)
    .rotate() // bake in EXIF orientation now — toBuffer() drops the tag below
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_WIDTH, { fit: "cover" })
    .toBuffer();
}

// EXIF (phone photos often carry GPS coordinates for the exact shot
// location — more precise than the event's already-public address, no
// reason to carry it into a publicly served file) is stripped by
// toBuffer() itself: sharp omits all EXIF/ICC/XMP metadata from its
// output unless withMetadata() is called, which this never does.
// .rotate() isn't what strips it — it reads the EXIF orientation tag
// before that happens and physically re-encodes the pixels to match, so
// the photo doesn't come out sideways once the tag that would've
// corrected it is gone.
export async function stripExif(original: Buffer): Promise<Buffer> {
  return sharp(original).rotate().toBuffer();
}
