// Builds a stand-in page with Robo on it into /tmp/rt, so his behaviour can be tested in a real browser.
// Then: (cd /tmp/rt && python3 -m http.server 8125 &) and python3 scripts/roam-check/run.py
import { stripTypeScriptTypes } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
mkdirSync("/tmp/rt", { recursive: true });
const LIB = new URL("../../src/lib/", import.meta.url);
const { rigMarkup, POSES } = await import(new URL("robo-rig.ts", LIB).href);
const { walkMarkup } = await import(new URL("robo-walk.ts", LIB).href);
for (const f of ["robo-rig", "robo-walk", "heart", "robo-roam"]) {
  let c = stripTypeScriptTypes(readFileSync(new URL(`${f}.ts`, LIB), "utf8"));
  c = c.replace(/from "\.\/(robo-rig|robo-walk|heart)"/g, 'from "./$1.mjs"');
  writeFileSync(`/tmp/rt/${f}.mjs`, c);
}
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--violet:#725DFF;--lilac:#A979FA;--lens:#6294FF;--ink:#201E2D;--paper:#FFFFFA}
body{margin:0;font:16px sans-serif;background:#fffffa;color:#201e2d}
header{position:sticky;top:0;height:60px;background:#fff;border-bottom:2px solid #201e2d;display:flex;gap:24px;align-items:center;padding:0 20px;z-index:40}
main{padding:20px;max-width:880px;margin:0 auto;min-height:3000px}h1{font-size:40px;margin:30px 0}h2{font-size:28px;margin:70px 0 20px}
.card{border:2px solid #201e2d;padding:20px;margin:20px 0;height:140px;background:#fff}.avoid{height:220px;background:#e9e6f5;border:2px dashed #888;margin:20px 0}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.rr{position:absolute;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;border:3px solid #6294FF;box-shadow:0 0 14px #6294FF,inset 0 0 14px #6294FF;opacity:0;pointer-events:none}
.rr.go{animation:rrgo .6s ease-out}@keyframes rrgo{0%{opacity:0;transform:scale(.2) rotate(0)}25%{opacity:1}100%{opacity:0;transform:scale(1.5) rotate(160deg)}}
#hit{position:absolute;left:27%;right:27%;top:6%;bottom:6%;border:0;background:rgba(255,0,0,.10);pointer-events:auto;cursor:grab;touch-action:none}
#bubble{position:absolute;left:0;top:0;width:max-content;max-width:260px;border:2px solid #201e2d;background:#fffffa;padding:8px 12px;font:11px monospace;opacity:0;pointer-events:none;transition:opacity .2s}#bubble[data-on=true]{opacity:1}
</style></head><body>
<header><a href="/home" id="navHome">Home</a><a href="/team" id="navTeam">Team</a><a href="/contact" id="navContact">Contact</a></header>
<main id="main"></main>
<div id="layer" style="position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden">
 <div id="robo" style="position:absolute;left:0;top:0"><div id="puppet" style="position:relative;width:100%;height:100%;transform-origin:50% 93.7%">
  <div id="front" style="position:absolute;inset:0">${rigMarkup(POSES.sleep, false, false)}</div>
  <div id="side" style="position:absolute;inset:0;display:none">${walkMarkup()}</div>
  <div id="scan" style="position:absolute;left:10%;right:10%;height:3px;background:#6294FF;opacity:0;top:3%"></div></div>
  <button id="hit" aria-label="Robo"></button></div>
 <div id="bubble" data-on="false"></div><div id="ringA" class="rr"></div><div id="ringB" class="rr"></div><p id="live" class="sr-only"></p></div>
<script type="module">
import { startRoam } from "./robo-roam.mjs";
const q = new URLSearchParams(location.search);
const pages = { "/home": ["Home", 3], "/team": ["Team", 3], "/contact": ["Contact", 2] };
function render(path) { const [t, n] = pages[path] || ["Home", 3]; let h = '<h1 id="h1">' + t + '</h1><div class="card" id="c0">Intro card</div>';
  for (let i = 1; i <= n; i++) h += '<h2 id="h2-' + i + '">Section ' + i + '</h2><div class="card" data-robo-perch id="card' + i + '">Card ' + i + '</div>';
  h += '<div class="avoid" data-robo-avoid id="avoid">GAME ZONE</div>'; document.getElementById("main").innerHTML = h; }
history.replaceState({}, "", "/home"); render("/home");
const g = (id) => document.getElementById(id);
const dom = { layer: g("layer"), robo: g("robo"), puppet: g("puppet"), front: g("front"), side: g("side"), hit: g("hit"), bubble: g("bubble"), live: g("live"), scan: g("scan"), ringA: g("ringA"), ringB: g("ringB") };
window.__robo = startRoam(dom, { seen: q.get("seen") === "1", reduced: q.get("reduced") === "1", rest: q.get("rest") === "1", timeScale: Number(q.get("scale") || 3), onTap: (x, y) => { window.__tap = { x, y }; } });
document.addEventListener("click", (e) => { const a = e.target.closest("a[href]"); if (!a) return; e.preventDefault(); history.pushState({}, "", a.getAttribute("href")); render(location.pathname); scrollTo(0, 0); window.__robo.onRoute(location.pathname); });
window.__ready = true;
</script></body></html>`;
writeFileSync("/tmp/rt/index.html", html); console.log("built");
