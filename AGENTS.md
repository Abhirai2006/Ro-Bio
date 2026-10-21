## Project rules
- Club facts (contacts, events, dates, member count, live address) live in src/lib/site.ts so non-developers can update them in one place.
- Registration stays "coming soon" with no backend until the club confirms the rules.
- The logo is the uploaded original at src/assets/robio-logo.jpg. Do not redraw it or replace it with a generated version.
- Deployed to Cloudflare Workers. The Worker name in wrangler.jsonc must match the project name in the Cloudflare dashboard.
