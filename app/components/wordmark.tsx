// "What's Your Take?" wordmark — Neue Haas Grotesk Display Pro, outlined in
// Illustrator and exported as paths (the face is Adobe-licensed, so it is
// not self-hosted as a web font). Source files live in the design archive
// alongside the poster artwork; regenerate from there, never hand-edit.
//
// Fill is currentColor so the mark follows the surrounding text color
// (`text-black` matches the poster's #231f20; the footer inverts it).
// Size with a height utility and `w-auto`; the viewBox is trimmed to the
// letter bounds, so there is no built-in padding.
//
// Both marks name themselves to assistive tech. Pass `decorative` when a
// wrapping link already carries the accessible name.

import { WrtpIcon } from "~/components/wrtp-icon";
import { cn } from "~/lib/utils";

type WordmarkProps = { className?: string; decorative?: boolean };

const LABEL = "What’s Your Take?";

function a11y(decorative: boolean | undefined) {
  return decorative ? { "aria-hidden": true as const } : { role: "img", "aria-label": LABEL };
}

/** One-line lockup, for the site header. Aspect ratio 10.91:1. */
export function WordmarkLine({ className, decorative }: WordmarkProps) {
  return (
    <svg
      viewBox="0 0 1161.58 106.5"
      fill="currentColor"
      className={className}
      {...a11y(decorative)}
    >
      <path d="M90.84,104.79h-25.5l-6.09-34.32c-1.18-6.64-2.07-12.39-2.66-17.25-.3-2.41-.55-4.42-.76-6.03-.21-1.61-.36-2.83-.44-3.68-.21,1.73-.53,4.97-.95,9.71-.21,2.41-.47,4.95-.76,7.61-.3,2.66-.66,5.48-1.08,8.44l-5.01,35.52h-25.75L0,6.85h26.13l4.31,26.96c1.65,10.74,2.79,19.18,3.43,25.31l.89,8.94.82-7.68c.89-8.96,2.03-17.49,3.43-25.56l4.95-27.97h22.77l4.44,23.53c2.11,10.95,3.95,23.91,5.52,38.88.46-6.72.97-12.69,1.52-17.89.55-5.2,1.16-9.92,1.84-14.15l4.82-30.38h25.82l-19.85,97.94Z" />
      <path d="M183.07,104.79h-26.45v-39.39h-12.62v39.39h-26.45V6.85h26.45v34.63h12.62V6.85h26.45v97.94Z" />
      <path d="M267.3,104.79h-27.34l-1.97-12.43h-17.82l-2.16,12.43h-27.34L214.21,6.85h32.35l20.74,97.94ZM234.89,71.36l-1.71-11.42s-.13-.61-.25-1.71c-.09-.93-.53-4.61-1.33-11.04-.09-.72-.19-1.7-.32-2.95-.13-1.25-.3-2.82-.51-4.73l-.82-9.26c-.08.89-.2,1.88-.35,2.98-.15,1.1-.31,2.31-.48,3.62-.3,2.62-.51,4.44-.63,5.46-.13,1.01-.21,1.63-.25,1.84l-1.84,11.86-2.66,15.35h11.16Z" />
      <path d="M309.17,104.79h-26.45V30.32h-14.59V6.85h56.2v23.47h-15.16v74.47Z" />
      <path d="M367.21,6.85l-17.13,47.13h-20.87l11.99-47.13h26.01Z" />
      <path d="M376.85,102.38v-30.76c5.2,7.1,10.83,10.66,16.87,10.66,2.28,0,4.14-.6,5.58-1.81,1.44-1.21,2.16-2.72,2.16-4.54,0-2.62-1.57-5.18-4.69-7.68l-4.31-3.36c-2.88-2.16-5.33-4.3-7.36-6.44-2.03-2.14-3.68-4.33-4.95-6.6-1.27-2.26-2.2-4.6-2.79-7.01-.59-2.41-.89-4.95-.89-7.61,0-4.57,1.06-9.35,3.17-14.34,1.06-2.33,2.28-4.45,3.68-6.38,1.4-1.92,3-3.63,4.82-5.11,4.99-4.23,11.02-6.34,18.08-6.34,6.3,0,12.64,1.67,19.03,5.01v29.94c-2.16-3.34-4.61-5.97-7.36-7.9-2.75-1.92-5.46-2.89-8.12-2.89-2.03,0-3.7.59-5.01,1.78-1.35,1.14-2.03,2.52-2.03,4.12,0,2.62,1.8,5.22,5.39,7.8l4.19,3.11c5.58,4.02,9.58,8.14,11.99,12.37,2.45,4.23,3.68,9.18,3.68,14.84,0,9.64-2.94,17.59-8.82,23.85-5.88,6.26-13.32,9.39-22.33,9.39-6.22,0-12.88-1.38-19.98-4.12Z" />
      <path d="M521.29,104.79h-26.45v-41.48l-24.29-56.46h27.59l4.76,14.53c.93,2.83,1.76,5.56,2.51,8.18.74,2.62,1.41,5.14,2,7.55.97-3.59,1.82-6.69,2.54-9.29.72-2.6,1.35-4.7,1.9-6.31l4.82-14.65h27.4l-22.77,56.46v41.48Z" />
      <path d="M618.72,56.14c0,14.93-3.4,27.06-10.21,36.41-6.77,9.3-15.58,13.96-26.45,13.96-9.64,0-17.91-3.57-24.8-10.72-8.67-9.05-13-22.62-13-40.72s4.52-30.6,13.57-39.77c6.72-6.81,14.69-10.21,23.91-10.21,11.29,0,20.28,4.61,26.96,13.83,6.68,9.22,10.02,21.63,10.02,37.23ZM591.26,56.33c0-17.72-3.13-26.58-9.39-26.58-3.13,0-5.62,2.33-7.48,6.98-1.82,4.31-2.73,10.66-2.73,19.03s.86,14.64,2.57,19.19c1.71,4.55,4.09,6.82,7.14,6.82s5.54-2.24,7.23-6.72c1.78-4.48,2.67-10.72,2.67-18.71Z" />
      <path d="M669.98,6.85h26.45v69.27c0,5.79-.91,10.49-2.73,14.08-1.78,3.76-4.74,7.17-8.88,10.21-5.58,4.06-12.37,6.09-20.36,6.09-9.05,0-16.64-2.24-22.77-6.72-7.78-5.71-11.67-14.84-11.67-27.4V6.85h26.45v63.18c0,4.27.52,7.29,1.55,9.07,1.04,1.78,2.78,2.66,5.23,2.66s4.29-.82,5.26-2.47c.97-1.73,1.46-4.8,1.46-9.2V6.85Z" />
      <path d="M779.78,104.79h-28.61l-13.07-34.89c-.13-.59-.35-1.37-.67-2.35-.32-.97-.71-2.13-1.17-3.49l.19,6.47v34.25h-26.32V6.85h27.09c11.92,0,20.85,2.35,26.77,7.04,7.53,6.01,11.29,14.55,11.29,25.63,0,11.84-5.05,20.02-15.16,24.55l19.66,40.72ZM736.58,52.21h1.78c3.04,0,5.58-1.16,7.61-3.49,2.03-2.33,3.04-5.29,3.04-8.88,0-7.32-3.83-10.97-11.48-10.97h-.95v23.34Z" />
      <path d="M861.8,104.79h-26.45V30.32h-14.59V6.85h56.2v23.47h-15.16v74.47Z" />
      <path d="M952,104.79h-27.34l-1.97-12.43h-17.82l-2.16,12.43h-27.34l23.53-97.94h32.35l20.74,97.94ZM919.58,71.36l-1.71-11.42s-.13-.61-.25-1.71c-.08-.93-.53-4.61-1.33-11.04-.08-.72-.19-1.7-.32-2.95-.13-1.25-.3-2.82-.51-4.73l-.82-9.26c-.09.89-.2,1.88-.35,2.98-.15,1.1-.31,2.31-.48,3.62-.3,2.62-.51,4.44-.63,5.46-.13,1.01-.21,1.63-.25,1.84l-1.84,11.86-2.66,15.35h11.16Z" />
      <path d="M1031.54,104.79h-28.54l-17.57-45.16.7,45.16h-26.45V6.85h26.45l-.7,41.99,15.6-41.99h27.91l-21.12,47.26,23.72,50.68Z" />
      <path d="M1039.15,104.79V6.85h49.16v23.03h-22.71v14.27h20.36v22.14h-20.36v14.97h22.71v23.53h-49.16Z" />
      <path d="M1142.8,69.33h-25.18v-23.98c1.78.13,3.09.19,3.93.19,4.82,0,8.33-1.02,10.53-3.08,2.2-2.05,3.3-5.32,3.3-9.8,0-7.23-1.9-10.85-5.71-10.85s-5.52,3.72-5.52,11.16h-25.5c0-9.18,1.92-16.32,5.77-21.44,2.58-3.55,6.17-6.36,10.78-8.44,4.27-2.07,9.11-3.11,14.53-3.11,9.3,0,16.94,3.02,22.9,9.07,5.96,6.05,8.94,13.76,8.94,23.15,0,7.19-1.58,13.08-4.73,17.67-3.15,4.59-7.83,7.71-14.05,9.36v10.09ZM1145.21,91.53c0,4.06-1.46,7.51-4.38,10.34-3,2.88-6.47,4.31-10.4,4.31s-7.46-1.44-10.47-4.31c-2.88-3-4.31-6.51-4.31-10.53s1.44-7.59,4.31-10.59c2.83-2.92,6.3-4.38,10.4-4.38s7.7,1.48,10.53,4.44c2.88,3,4.31,6.58,4.31,10.72Z" />
    </svg>
  );
}

/** Three-line stack, as on the poster. Aspect ratio 1.22:1. */
export function WordmarkStacked({ className, decorative }: WordmarkProps) {
  return (
    <svg
      viewBox="0 0 427.98 350.63"
      fill="currentColor"
      className={className}
      {...a11y(decorative)}
    >
      <path d="M90.84,99.72h-25.5l-6.09-34.32c-1.18-6.64-2.07-12.39-2.66-17.25-.3-2.41-.55-4.42-.76-6.03-.21-1.61-.36-2.83-.44-3.68-.21,1.73-.53,4.97-.95,9.71-.21,2.41-.47,4.95-.76,7.61-.3,2.66-.66,5.48-1.08,8.44l-5.01,35.52h-25.75L0,1.78h26.13l4.31,26.96c1.65,10.74,2.79,19.18,3.43,25.31l.89,8.94.82-7.68c.89-8.96,2.03-17.49,3.43-25.56L43.96,1.78h22.77l4.44,23.53c2.11,10.95,3.95,23.91,5.52,38.88.46-6.72.97-12.69,1.52-17.89.55-5.2,1.16-9.92,1.84-14.15l4.82-30.38h25.82l-19.85,97.94Z" />
      <path d="M183.07,99.72h-26.45v-39.39h-12.62v39.39h-26.45V1.78h26.45v34.63h12.62V1.78h26.45v97.94Z" />
      <path d="M267.3,99.72h-27.34l-1.97-12.43h-17.82l-2.16,12.43h-27.34L214.21,1.78h32.35l20.74,97.94ZM234.89,66.29l-1.71-11.42s-.13-.61-.25-1.71c-.09-.93-.53-4.61-1.33-11.04-.09-.72-.19-1.7-.32-2.95-.13-1.25-.3-2.82-.51-4.73l-.82-9.26c-.08.89-.2,1.88-.35,2.98-.15,1.1-.31,2.31-.48,3.62-.3,2.62-.51,4.44-.63,5.46-.13,1.01-.21,1.63-.25,1.84l-1.84,11.86-2.66,15.35h11.16Z" />
      <path d="M309.17,99.72h-26.45V25.25h-14.59V1.78h56.2v23.47h-15.16v74.47Z" />
      <path d="M367.21,1.78l-17.13,47.13h-20.87l11.99-47.13h26.01Z" />
      <path d="M376.85,97.31v-30.76c5.2,7.1,10.83,10.66,16.87,10.66,2.28,0,4.14-.6,5.58-1.81,1.44-1.21,2.16-2.72,2.16-4.54,0-2.62-1.57-5.18-4.69-7.68l-4.31-3.36c-2.88-2.16-5.33-4.3-7.36-6.44-2.03-2.14-3.68-4.33-4.95-6.6-1.27-2.26-2.2-4.6-2.79-7.01-.59-2.41-.89-4.95-.89-7.61,0-4.57,1.06-9.35,3.17-14.34,1.06-2.33,2.28-4.45,3.68-6.38,1.4-1.92,3-3.63,4.82-5.11,4.99-4.23,11.02-6.34,18.08-6.34,6.3,0,12.64,1.67,19.03,5.01v29.94c-2.16-3.34-4.61-5.97-7.36-7.9-2.75-1.92-5.46-2.89-8.12-2.89-2.03,0-3.7.59-5.01,1.78-1.35,1.14-2.03,2.52-2.03,4.12,0,2.62,1.8,5.22,5.39,7.8l4.19,3.11c5.58,4.02,9.58,8.14,11.99,12.37,2.45,4.23,3.68,9.18,3.68,14.84,0,9.64-2.94,17.59-8.82,23.85-5.88,6.26-13.32,9.39-22.33,9.39-6.22,0-12.88-1.38-19.98-4.12Z" />
      <path d="M50.75,224.48h-26.45v-41.48L0,126.54h27.59l4.76,14.53c.93,2.83,1.77,5.56,2.51,8.18.74,2.62,1.41,5.14,2,7.55.97-3.59,1.82-6.69,2.54-9.29.72-2.6,1.35-4.7,1.9-6.31l4.82-14.65h27.4l-22.77,56.46v41.48Z" />
      <path d="M148.18,175.82c0,14.93-3.4,27.06-10.21,36.41-6.77,9.3-15.58,13.96-26.45,13.96-9.64,0-17.91-3.57-24.8-10.72-8.67-9.05-13-22.62-13-40.72s4.52-30.6,13.57-39.77c6.72-6.81,14.69-10.21,23.91-10.21,11.29,0,20.28,4.61,26.96,13.83,6.68,9.22,10.02,21.63,10.02,37.23ZM120.71,176.01c0-17.72-3.13-26.58-9.39-26.58-3.13,0-5.62,2.33-7.48,6.98-1.82,4.31-2.73,10.66-2.73,19.03s.86,14.64,2.57,19.19c1.71,4.55,4.09,6.82,7.14,6.82s5.54-2.24,7.23-6.72c1.78-4.48,2.66-10.72,2.66-18.71Z" />
      <path d="M199.43,126.54h26.45v69.27c0,5.79-.91,10.49-2.73,14.08-1.78,3.76-4.74,7.17-8.88,10.21-5.58,4.06-12.37,6.09-20.36,6.09-9.05,0-16.64-2.24-22.77-6.72-7.78-5.71-11.67-14.84-11.67-27.4v-65.53h26.45v63.18c0,4.27.52,7.29,1.55,9.07,1.04,1.78,2.78,2.67,5.23,2.67s4.29-.83,5.27-2.47c.97-1.73,1.46-4.8,1.46-9.2v-63.24Z" />
      <path d="M309.23,224.48h-28.61l-13.07-34.89c-.13-.59-.35-1.37-.67-2.35-.32-.97-.71-2.13-1.17-3.49l.19,6.47v34.25h-26.32v-97.94h27.09c11.92,0,20.85,2.35,26.77,7.04,7.53,6.01,11.29,14.55,11.29,25.63,0,11.84-5.05,20.02-15.16,24.55l19.66,40.72ZM266.04,171.89h1.78c3.04,0,5.58-1.16,7.61-3.49,2.03-2.33,3.04-5.29,3.04-8.88,0-7.32-3.83-10.97-11.48-10.97h-.95v23.34Z" />
      <path d="M41.04,349.24H14.59v-74.47H0v-23.47h56.2v23.47h-15.16v74.47Z" />
      <path d="M131.24,349.24h-27.34l-1.97-12.43h-17.82l-2.16,12.43h-27.34l23.53-97.94h32.35l20.74,97.94ZM98.83,315.81l-1.71-11.42s-.13-.61-.25-1.71c-.09-.93-.53-4.61-1.33-11.04-.09-.72-.19-1.7-.32-2.95-.13-1.25-.3-2.82-.51-4.73l-.82-9.26c-.08.89-.2,1.88-.35,2.98-.15,1.1-.31,2.31-.48,3.62-.3,2.62-.51,4.44-.63,5.46-.13,1.01-.21,1.63-.25,1.84l-1.84,11.86-2.66,15.35h11.16Z" />
      <path d="M210.79,349.24h-28.54l-17.57-45.16.7,45.16h-26.45v-97.94h26.45l-.7,41.99,15.6-41.99h27.91l-21.12,47.26,23.72,50.68Z" />
      <path d="M218.4,349.24v-97.94h49.16v23.03h-22.71v14.27h20.36v22.14h-20.36v14.97h22.71v23.53h-49.16Z" />
      <path d="M322.05,313.78h-25.18v-23.98c1.78.13,3.09.19,3.93.19,4.82,0,8.33-1.02,10.53-3.08,2.2-2.05,3.3-5.32,3.3-9.8,0-7.23-1.9-10.85-5.71-10.85s-5.52,3.72-5.52,11.16h-25.5c0-9.18,1.92-16.32,5.77-21.44,2.58-3.55,6.17-6.36,10.78-8.44,4.27-2.07,9.11-3.11,14.53-3.11,9.3,0,16.94,3.02,22.9,9.07,5.96,6.05,8.94,13.76,8.94,23.15,0,7.19-1.58,13.08-4.73,17.67-3.15,4.59-7.83,7.71-14.05,9.36v10.08ZM324.46,335.98c0,4.06-1.46,7.51-4.38,10.34-3,2.88-6.47,4.31-10.4,4.31s-7.46-1.44-10.47-4.31c-2.88-3-4.31-6.51-4.31-10.53s1.44-7.59,4.31-10.59c2.83-2.92,6.3-4.38,10.4-4.38s7.7,1.48,10.53,4.44c2.88,3,4.31,6.58,4.31,10.72Z" />
    </svg>
  );
}

/**
 * The WrTP stripes, sized to frame the text beside them. The bars are wavy:
 * the right edge of the icon stops at y=191.23 of its 208.28 viewBox, because
 * the bottom bar starts low at left and ends higher at right. The *right
 * edge* is what frames the text, so the wrapper is stretched to the height of
 * the grid rows it spans and the icon is scaled so the bottom bar's
 * bottom-right corner lands at the tagline's bottom. The top-right corner
 * rides a smidge above the wordmark (STRIPES_TOP_OVERHANG, a fraction of the
 * text height), so the top of the "W" sits just beneath it rather than flush.
 * The bottom bar's left end hangs ~8% below the text, as on the poster. Width
 * follows from the aspect ratio. Place it in a grid and give it `row-span-*`.
 */
const STRIPES_RIGHT_EDGE_H = 191.23;
const STRIPES_VIEWBOX_H = 208.28;
const STRIPES_VIEWBOX_W = 193.91;
const STRIPES_TOP_OVERHANG = 0.03;

// `textHeight` is a CSS length expression for the height of the text block the
// stripes frame. The width is computed from it explicitly rather than via
// `aspect-ratio` on a stretched grid item: that form resolves to zero width
// when the lockup is sized shrink-to-fit (e.g. as a flex item), collapsing
// the stripes onto the wordmark.
function FramingStripes({ className, textHeight }: { className?: string; textHeight: string }) {
  const edge = 1 + STRIPES_TOP_OVERHANG; // right-edge height / text height
  const widthPerHeight = STRIPES_VIEWBOX_W / (STRIPES_RIGHT_EDGE_H * edge);
  return (
    <span
      className={cn("relative self-stretch", className)}
      style={{ width: `calc((${textHeight}) * ${widthPerHeight})` }}
    >
      <WrtpIcon
        className="absolute left-0 w-full text-wrtp-brand-orange"
        style={{
          top: `${-STRIPES_TOP_OVERHANG * 100}%`,
          height: `${(STRIPES_VIEWBOX_H / STRIPES_RIGHT_EDGE_H) * edge * 100}%`,
        }}
      />
    </span>
  );
}

/**
 * The poster lockup: WrTP stripes at left, stacked wordmark at right,
 * tagline beneath the wordmark. The stripes' right edge frames all the text:
 * top corner a smidge above the top of "What's", bottom-right corner at the tagline's bottom.
 * Sized by the `--mark-h` custom property
 * (the wordmark's height), e.g. `className="[--mark-h:160px]"`; every other
 * dimension is derived from it so the proportions match the poster at any
 * size. The stripes stay brand orange and the lettering follows
 * currentColor, as everywhere else.
 */
export function WytLockup({ className, decorative }: WordmarkProps) {
  return (
    <div
      className={cn(
        "inline-grid grid-cols-[auto_auto] items-start gap-x-[calc(var(--mark-h)*0.13)] text-black",
        className,
      )}
    >
      {/* Text block = wordmark + 0.06 gap + tagline (leading-none, so its
          height is its font size). Keep in step with the classes below. */}
      <FramingStripes textHeight="var(--mark-h) * 1.06 + var(--tagline-size, var(--mark-h) * 0.085)" />
      <div className="flex flex-col items-start gap-y-[calc(var(--mark-h)*0.06)]">
        <WordmarkStacked className="h-(--mark-h) w-auto" decorative={decorative} />
        <span className="text-(length:--tagline-size,calc(var(--mark-h)*0.085)) leading-none text-muted-tan">
          A civic mirror project.
        </span>
      </div>
    </div>
  );
}

/**
 * The one-line lockup for headers: stripes, then the one-line wordmark, with
 * the tagline under the wordmark as on the poster, the stripes spanning both
 * (see WytLockup). Sized by `--mark-h` (the
 * wordmark's height) like WytLockup; the tagline stays live text at a fixed
 * reading size rather than scaling with the mark.
 */
export function WytLockupLine({ className, decorative }: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-grid grid-cols-[auto_auto] items-center gap-x-3.5 gap-y-1 text-black",
        className,
      )}
    >
      {/* Wordmark + 4px row gap (gap-y-1) + 12.5px tagline. */}
      <FramingStripes className="row-span-2" textHeight="var(--mark-h) + 4px + 12.5px" />
      <WordmarkLine className="h-(--mark-h) w-auto" decorative={decorative} />
      <span className="col-start-2 text-[12.5px] leading-none text-muted-tan">
        A civic mirror project.
      </span>
    </span>
  );
}
