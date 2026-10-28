import { site } from "./site";

export const canonical = (path: string) => ({ rel: "canonical", href: `${site.url}${path}` });
export const LAST_UPDATED = "28 October 2026";

export const address = {
  "@type": "PostalAddress",
  streetAddress: "Manasa Gangotri Campus",
  addressLocality: "Mysuru",
  addressRegion: "Karnataka",
  postalCode: "570006",
  addressCountry: "IN",
};
