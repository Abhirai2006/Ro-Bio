# RO-BIO website

Site for the RO-BIO club (Biomedical and Robotics Engineering, Mysore University School of Engineering).
Built with Next.js and deployed to Cloudflare Workers through the OpenNext adapter.

## How it deploys

Push to GitHub. Cloudflare installs the dependencies in `package.json`, builds and deploys. Nothing needs installing on your own computer.

Cloudflare settings (Workers and Pages, the `ro-bio` project, Settings, Build):

- Build command: `npm run build` (this runs the Next.js build and then the Cloudflare conversion)
- Deploy command: `npx wrangler deploy`
- Build variables and secrets: add `NEXT_PUBLIC_SITE_URL` with the live address, for example the `workers.dev` link or the custom domain. Without it, the sitemap and share links point at localhost.

The Worker name in `wrangler.jsonc` (`ro-bio`) must match the project name in Cloudflare.
Dependency versions are pinned exactly in `package.json`. They are the ones that built successfully on 2026-10-20.

## Run it locally (optional)

```
npm install
npm run dev
npm run preview
```

## What is built

Home, Events, About, Contact, Bot Forge page (registration shows "coming soon"), 404, sitemap, robots, light and dark theme.
Events are static data in `src/lib/events.ts` for now. The database in `supabase/` is written but not connected yet.

## Checks

`npm run check:dashes` fails if the em dash character appears anywhere.
