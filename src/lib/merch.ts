// The merch page's plain logic: cleaning what people type, likes keys and the checks the server repeats.
// Kept apart from the 3D code so it is easy to test.
import { merch, type MerchKind } from "@/lib/site";

export type ColourId = (typeof merch.colours)[number]["id"];

/** The sleeve number styles members can choose between. */
export const NUMBER_STYLES = [
  { id: "plate", name: "Armour", note: "Robot anime armour plate" },
  { id: "ink", name: "Ink slash", note: "Brush and red slash" },
  { id: "kanji", name: "Kanji", note: "Brush number with Japanese numerals" },
] as const;
export type NumberStyle = (typeof NUMBER_STYLES)[number]["id"];

/** What the 3D model shows right now. Nothing here is an order. */
export type Pick = {
  kind: MerchKind;
  colour: ColourId;
  name: string;
  number: string;
  style: NumberStyle;
};

export const NAME_MAX = 16;
export const NOTE_MAX = 600;
export const AUTHOR_MAX = 40;

/** Capitals, digits, spaces and a few marks that print cleanly. Never longer than NAME_MAX. */
export function cleanName(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 .'&]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^\s/, "")
    .slice(0, NAME_MAX);
}

/** Up to two digits, like a jersey number. */
export function cleanNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 2);
}

/** Plain text for a note: no control characters, spaces tidied, cut to `max`. */
export function cleanText(raw: unknown, max: number) {
  if (typeof raw !== "string") return "";
  return (
    raw
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, max)
  );
}

export const isKind = (v: unknown): v is MerchKind =>
  typeof v === "string" && merch.products.some((p) => p.kind === v);
export const isColour = (v: unknown): v is ColourId =>
  typeof v === "string" && merch.colours.some((c) => c.id === v);

export const likeKey = (kind: MerchKind, c: ColourId) => `${kind}:${c}`;

export const isStyle = (v: unknown): v is NumberStyle =>
  typeof v === "string" && NUMBER_STYLES.some((s) => s.id === v);
/** Votes for a number style share the likes table: the piece is "number" and the colour is the style. */
export const styleKey = (s: NumberStyle) => `number:${s}`;

export const product = (kind: MerchKind) => merch.products.find((p) => p.kind === kind)!;
export const colour = (id: ColourId) => merch.colours.find((c) => c.id === id)!;

export function rupees(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export type Tally = { counts: Record<string, number>; mine: string[] };

/** Total likes for one piece across its colours. */
export const pieceLikes = (t: Tally, kind: MerchKind) =>
  merch.colours.reduce((n, c) => n + (t.counts[likeKey(kind, c.id)] ?? 0), 0);

/** Calls the merch API on this site. Throws the server's own message when something is refused. */
export async function merchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/merch/${path}`, {
    credentials: "same-origin",
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data as T;
}
