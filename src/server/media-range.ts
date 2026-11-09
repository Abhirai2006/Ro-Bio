// Byte ranges for the squad clips in /team/art and the merch loop in /merch. Cloudflare's static assets always answer a Range request
// with the whole file and a 200, and Safari will not play a video without a proper 206 Partial Content.
// So wrangler.jsonc routes the clips to the Worker first (run_worker_first), the Worker fetches the file
// from the assets binding and cuts out the bytes that were asked for. The clips are a couple of MB at most.

export type AssetsEnv = { ASSETS?: { fetch: (req: Request) => Promise<Response> } };

/** The squad clips, /team/art/<name>.mp4 or .webm, and the merch loop, /merch/<name>.mp4 or .webm. */
export const isClip = (pathname: string) =>
  /^\/(team\/art|merch)\/[a-z0-9-]+\.(mp4|webm)$/.test(pathname);

/** Reads one "bytes=" range against a file of `size` bytes. Null means not satisfiable. */
export function parseRange(header: string, size: number): [number, number] | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    // the last N bytes
    const n = Number(m[2]);
    if (n === 0) return null;
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return null;
  return [start, end];
}

/** Turns the full asset response into a 206 for the requested bytes, or a 200 that says ranges work. */
export async function withRange(request: Request, asset: Response): Promise<Response> {
  const headers = new Headers(asset.headers);
  headers.set("Accept-Ranges", "bytes");
  const range = request.headers.get("Range");
  if (asset.status !== 200 || !range)
    return new Response(asset.body, { status: asset.status, headers });
  const body = await asset.arrayBuffer();
  const size = body.byteLength;
  const r = parseRange(range, size);
  if (!r) {
    headers.set("Content-Range", `bytes */${size}`);
    headers.delete("Content-Length");
    return new Response(null, { status: 416, headers });
  }
  const [start, end] = r;
  headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(end - start + 1));
  const part = request.method === "HEAD" ? null : body.slice(start, end + 1);
  return new Response(part, { status: 206, headers });
}

/** Serves a squad clip with byte ranges, or returns null so the request goes on as usual. */
export async function serveClip(request: Request, env: AssetsEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (
    !isClip(url.pathname) ||
    !env.ASSETS ||
    (request.method !== "GET" && request.method !== "HEAD")
  )
    return null;
  // ask the assets for the whole file, without the Range header
  const asset = await env.ASSETS.fetch(new Request(url.toString(), { method: "GET" }));
  const res = await withRange(request, asset);
  // the same caching public/_headers gives the other files in /team/art
  if (!res.headers.has("Cache-Control"))
    res.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  return res;
}
