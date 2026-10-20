# RO-BIO website

Site for the RO-BIO club (Biomedical and Robotics Engineering, Mysore University School of Engineering).
Built with Next.js and deployed to Cloudflare Workers through the OpenNext adapter.

## How it deploys

Push to GitHub. Cloudflare installs the dependencies in `package.json`, builds and deploys. Nothing needs installing on your own computer.

Cloudflare settings (Workers and Pages, the `ro-bio` project, Settings, Build):

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Build variables and secrets: add `NEXT_PUBLIC_SITE_URL` with the live address, for example `https://ro-bio.YOUR-SUBDOMAIN.workers.dev` or the custom domain. Without it, the sitemap and share links point at localhost.

The Worker name in `wrangler.jsonc` (`ro-bio`) must match the project name in Cloudflare.

## Run it locally (optional)

```
npm install
npm run dev
npm run preview
```

## What is built

Home, Events, Bot Forge page (registration shows "coming soon"), 404, sitemap, robots, light and dark theme.
Events are static data in `src/lib/events.ts` for now. The database in `supabase/` is written but not connected yet.

## Checks

`npm run check:dashes` fails if the em dash character appears anywhere.
