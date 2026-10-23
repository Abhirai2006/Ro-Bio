// Renders the robot in several poses to an HTML contact sheet, so the rig can be checked by eye.
// Usage: node --experimental-strip-types scripts/render-robo.mjs [out.html]
import { rigMarkup, POSES, REST } from "../src/lib/robo-rig.ts";
import { writeFileSync } from "node:fs";
const out = process.argv[2] || "/tmp/robo.html";
const cells = [
  ["sleep", POSES.sleep, false, "sleep"], ["sit up", POSES.sit, false, ""], ["stand", POSES.stand, false, ""], ["yawn", POSES.yawn, false, ""],
  ["think", POSES.think, false, ""], ["wave", POSES.wave, false, ""], ["stand, X-ray", { ...POSES.stand, beat: 0.8, breath: 1 }, true, ""], ["sleep, X-ray", POSES.sleep, true, "sleep"],
].map(([label, pose, x, phase]) => `<figure><div>${rigMarkup({ ...REST, ...pose }, x).replace('class="rb"', `class="rb" data-phase="${phase}"`)}</div><figcaption>${label}</figcaption></figure>`).join("");
const html = `<html><body style="margin:0;background:#FFFFFA;font:12px sans-serif"><style>:root{--violet:#725DFF;--lilac:#A979FA;--lens:#6294FF;--ink:#201E2D}
.g{display:grid;grid-template-columns:repeat(4,300px);gap:6px;padding:6px}figure{margin:0;border:2px solid #201E2D}figure div{height:318px}svg{width:100%;height:100%}figcaption{padding:3px 6px;background:#A979FA}</style><div class="g">${cells}</div></body></html>`;
writeFileSync(out, html); console.log("wrote", out, "(open it in a browser, or screenshot it)");
