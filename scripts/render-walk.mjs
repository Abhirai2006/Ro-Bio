// Renders Robo's side view through a walk cycle, a run, a jump and a fall to an HTML contact sheet.
// Usage: node --experimental-strip-types scripts/render-walk.mjs [out.html]
import { writeFileSync } from "node:fs";
import { walkMarkup, walkCycle, WALK_JUMP, WALK_FALL } from "../src/lib/robo-walk.ts";
const out = process.argv[2] || "/tmp/walk.html";
const cells = [];
for (let i = 0; i < 8; i++) cells.push([`walk ${i + 1}/8`, walkCycle((i / 8) * Math.PI * 2, 1)]);
cells.push(["run 1", walkCycle(0.3, 1.55)], ["run 2", walkCycle(2.2, 1.55)], ["jump", WALK_JUMP], ["fall", WALK_FALL]);
const html = `<html><body style="margin:0;background:#FFFFFA;font:12px sans-serif"><style>:root{--violet:#725DFF;--lilac:#A979FA;--lens:#6294FF;--ink:#201E2D}
.g{display:grid;grid-template-columns:repeat(6,200px);gap:4px;padding:4px}figure{margin:0;border:2px solid #201E2D;position:relative}figure div{height:218px}svg{width:100%;height:100%}figcaption{padding:2px 6px;background:#A979FA}
.floor{position:absolute;left:0;right:0;bottom:0;height:4px;background:#201E2D}</style><div class="g">${cells.map(([l, p]) => `<figure><div>${walkMarkup(p)}</div><figcaption>${l}</figcaption></figure>`).join("")}</div></body></html>`;
writeFileSync(out, html); console.log("wrote", out);
