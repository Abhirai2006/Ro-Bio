// The artwork printed on the club jacket, exactly as the design team made it: the "Define the Future" poster on
// the back, Mono on the left chest and the stars on the right chest. The college crest comes as a peel-off sticker
// for the right sleeve. The 3D model and the print map below it show these same files.

/**
 * Adds the build's fingerprint of public/merch (see vite.config.ts) to a link, so a changed file is fetched fresh
 * instead of coming from the browser's cache. Inline data and blob links are left alone.
 */
export function versioned(url: string) {
  const v = import.meta.env["VITE_MERCH_V"] as string | undefined;
  if (!v || /^(data|blob):/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${v}`;
}

export const POSTER_SRC = versioned("/merch/art/poster.webp");
export const MONO_SRC = versioned("/merch/art/mono.webp");
export const STARS_SRC = versioned("/merch/art/stars.webp");
export const CREST_SRC = versioned("/merch/muse-crest.webp");

/** Height over width of each file: the poster is 1200 x 1491, Mono 1000 x 798, the stars 1000 x 734. */
export const POSTER_ASPECT = 1491 / 1200;
export const MONO_ASPECT = 798 / 1000;
export const STARS_ASPECT = 734 / 1000;
/** The crest file is 568 x 632. */
export const CREST_ASPECT = 632 / 568;

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
