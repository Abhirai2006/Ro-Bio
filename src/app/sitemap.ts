import type { MetadataRoute } from "next";
import { SITE } from "@/lib/config/site";
import { EVENTS } from "@/lib/events";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/events", "/about", "/team", "/contact", ...EVENTS.map((e) => `/events/${e.slug}`)].map((p) => ({ url: `${SITE.baseUrl}${p}` }));
}
