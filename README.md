# RO-BIO website

Site for the RO-BIO club (Biomedical and Robotics Engineering, Mysore University School of Engineering).
Read `AGENTS.md` first if you are an AI, then `PRD.md`.

## Run it

Dependency versions are not pinned in `package.json` on purpose. Your package manager picks the current ones.

```
pnpm add next react react-dom
pnpm add -D typescript @types/react @types/react-dom @types/node @opennextjs/cloudflare wrangler
pnpm dev
```

Commit `pnpm-lock.yaml` after the first install. Open http://localhost:3000.

## Deploy to Cloudflare Workers

```
pnpm exec wrangler login
pnpm run preview     # builds with the OpenNext adapter and runs it locally
pnpm run deploy      # builds and deploys
```

Use `pnpm run deploy`. Plain `pnpm deploy` is a different built-in pnpm command.
Set `NEXT_PUBLIC_SITE_URL` to the live address (see `.env.example`). It is the only place the address lives.

## What is built

Home, Events, Bot Forge page (registration shows "coming soon"), 404, sitemap, robots, light and dark theme.
Events are static data in `src/lib/events.ts` for now. The database in `supabase/` is written but not connected yet.

## Checks

`pnpm check:dashes` fails if the em dash character appears anywhere.
