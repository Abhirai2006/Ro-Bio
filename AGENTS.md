## Project rules

- Club facts (contacts, events, dates, member count, live address) live in src/lib/site.ts so non-developers can update them in one place.
- RO-BIO is open to students of every branch at MUSE. Never call it the club of one branch or department. `site.branch` is only the faculty's department.
- Bot Forge registration is on /events/bot-forge/register. It opens and closes by itself at `opensAt` and `closesAt` in src/lib/site.ts, and teams' details live only in the BotForgeStore Durable Object, never in the repo. Its rules stay marked as a draft (`botForgeInfo.rulesDraft`) until the club confirms them. Other events' registration stays "coming soon" with no backend until the club confirms their rules. Core member recruitment students sign up on /join, and their details live only in the RecruitStore Durable Object.
- The logo is the uploaded original at src/assets/robio-logo.jpg. Do not redraw it or replace it with a generated version.
- Deployed to Cloudflare Workers. The Worker name in wrangler.jsonc must match the project name in the Cloudflare dashboard.
- Never use em dashes or en dashes anywhere: copy, comments, docs.
- What Robo says lives in src/lib/robo-talk.ts and is built from site.ts. Do not hardcode dates or counts in his lines.
- Keep package-lock.json committed. Cloudflare runs npm ci with it; without it, npm 10 can fail to resolve dependencies.
