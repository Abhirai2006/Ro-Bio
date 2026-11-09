import { describe, expect, it } from "vitest";
import { isClip, parseRange, serveClip, withRange } from "./media-range";

const file = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
const asset = () =>
  new Response(file.slice(), {
    status: 200,
    headers: { "content-type": "video/mp4", etag: '"abc"' },
  });
const req = (range?: string, method = "GET") =>
  new Request("https://x.test/team/art/technical-1600.mp4", {
    method,
    headers: range ? { Range: range } : {},
  });

describe("squad clip byte ranges", () => {
  it("only takes the squad clips", () => {
    expect(isClip("/team/art/technical-1600.mp4")).toBe(true);
    expect(isClip("/team/art/social-media-960.webm")).toBe(true);
    expect(isClip("/team/art/technical-1600.webp")).toBe(false);
    expect(isClip("/team/art/../secret.mp4")).toBe(false);
    expect(isClip("/team/technical")).toBe(false);
    expect(isClip("/merch/kit-loop.mp4")).toBe(true);
    expect(isClip("/merch/models/jacket/jacket.bin")).toBe(false);
  });

  it("reads ranges the way browsers send them", () => {
    expect(parseRange("bytes=0-", 100)).toEqual([0, 99]);
    expect(parseRange("bytes=0-1", 100)).toEqual([0, 1]);
    expect(parseRange("bytes=10-200", 100)).toEqual([10, 99]);
    expect(parseRange("bytes=-10", 100)).toEqual([90, 99]);
    expect(parseRange("bytes=100-", 100)).toBeNull();
    expect(parseRange("bytes=5-2", 100)).toBeNull();
    expect(parseRange("bytes=-", 100)).toBeNull();
    expect(parseRange("items=0-1", 100)).toBeNull();
  });

  it("answers a range with 206 and exactly those bytes", async () => {
    const res = await withRange(req("bytes=0-1"), asset());
    expect(res.status).toBe(206);
    expect(res.headers.get("Content-Range")).toBe("bytes 0-1/100");
    expect(res.headers.get("Content-Length")).toBe("2");
    expect(res.headers.get("content-type")).toBe("video/mp4");
    expect([...new Uint8Array(await res.arrayBuffer())]).toEqual([0, 1]);
  });

  it("says ranges work on a plain request, and refuses a range past the end", async () => {
    const plain = await withRange(req(), asset());
    expect(plain.status).toBe(200);
    expect(plain.headers.get("Accept-Ranges")).toBe("bytes");
    const bad = await withRange(req("bytes=500-"), asset());
    expect(bad.status).toBe(416);
    expect(bad.headers.get("Content-Range")).toBe("bytes */100");
  });

  it("fetches the whole file from the assets binding, then cuts it", async () => {
    let asked: Request | undefined;
    const env = {
      ASSETS: {
        fetch: async (r: Request) => {
          asked = r;
          return asset();
        },
      },
    };
    const res = await serveClip(req("bytes=50-59"), env);
    expect(asked?.headers.get("Range")).toBeNull();
    expect(res?.status).toBe(206);
    expect([...new Uint8Array(await res!.arrayBuffer())]).toEqual([
      50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
    ]);
    expect(await serveClip(new Request("https://x.test/team"), env)).toBeNull();
    expect(await serveClip(req("bytes=0-1"), {})).toBeNull();
  });
});
