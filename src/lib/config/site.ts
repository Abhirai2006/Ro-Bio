// The one place for brand facts. Change them here, not inside components.
export const SITE = {
  name: "RO-BIO",
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  instagram: "https://www.instagram.com/ro_bio_hub/",
  startedOn: "2026-05-20",
  timeZone: "Asia/Kolkata",
  parent: "Mysore University School of Engineering",
  address: "Mysore University School of Engineering, Manasa Gangotri Campus, Mysore-570006",
  facultyCoordinator: "Archana G",
} as const;
