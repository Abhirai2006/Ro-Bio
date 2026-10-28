import { buildFaqs } from "./faq-build";
import { coreTeamSize, events, formatDate, site } from "@/lib/site";

/** One source for the FAQ page and its structured data. Every answer is built from the site's own facts. */
export const faqs = buildFaqs(site, events, formatDate, coreTeamSize);
