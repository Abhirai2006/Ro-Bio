"""Renders the scroll sequence from the approved logo trace: a scan line sweeps up the plotting grid
and every colour layer is built behind it, in the order the trace found them.
Usage: python3 scripts/render_frames.py"""
import re, os, io
from PIL import Image
from playwright.sync_api import sync_playwright
N, SIZE, GAP = 64, 720, 40
svg = open("brand/logo-color-layers.svg").read()
ids = re.findall(r'<g id="layer-(\d\d)-', svg); K = len(ids)
svg = re.sub(r'<g id="layer-(\d\d)-', lambda m: f'<g clip-path="url(#c{m.group(1)})" id="layer-{m.group(1)}-', svg)
defs = "<defs>" + "".join(f'<clipPath id="c{i}"><rect id="r{i}" x="0" y="0" width="1080" height="1080"/></clipPath>' for i in ids) + "</defs>"
svg = svg.replace('role="img"', 'role="img" id="logo"', 1)
svg = re.sub(r'(<svg[^>]*>)', r'\1' + defs, svg, 1)
html = f"""<html><body style="margin:0;background:#FFFFFA"><div id="s" style="position:relative;width:1080px;height:1080px;overflow:hidden;
background-color:#FFFFFA;background-image:linear-gradient(rgba(98,148,255,.16) 1px,transparent 1px),linear-gradient(90deg,rgba(98,148,255,.16) 1px,transparent 1px);background-size:54px 54px">
<svg width="1080" height="1080" style="position:absolute;inset:0"><g stroke="#201E2D" stroke-opacity=".35" stroke-width="2" fill="none">
<path d="M36 90V36H90M990 36H1044V90M36 990V1044H90M990 1044H1044V990"/></g></svg>{svg}
<svg id="scan" width="1080" height="1080" style="position:absolute;inset:0;opacity:0"><defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#725DFF" stop-opacity=".28"/><stop offset="1" stop-color="#725DFF" stop-opacity="0"/></linearGradient></defs>
<rect id="glow" x="0" width="1080" height="90" fill="url(#g)"/><rect id="line" x="0" width="1080" height="4" fill="#725DFF"/>
<g id="ticks" stroke="#201E2D" stroke-width="3"><path d="M0 0v0"/></g></svg></div>
<script>const K={K},H=1080,GAP={GAP},Y0=920;
function setT(t){{const s=Math.min(1,Math.max(0,(t-.08)/.82));const travel=(Y0-200)+(K-1)*GAP;
for(let k=0;k<K;k++){{const y=Y0-s*travel+k*GAP;document.getElementById('r'+String(k).padStart(2,'0')).setAttribute('y',Math.max(0,y)); }}
const front=Math.min(H,Math.max(0,Y0-s*travel)),sc=document.getElementById('scan');
const live=t>.04&&s<1;sc.style.opacity=live?1:0;const a=t<.08?Math.min(1,(t-.04)/.04):1;sc.style.opacity=live?a:0;
const fy=t<.08?Y0:front;document.getElementById('line').setAttribute('y',fy);document.getElementById('glow').setAttribute('y',fy-86);
document.getElementById('ticks').innerHTML=[0,1].map(i=>`<path d="M${{i?1080-46:0}} ${{fy+2}}h46"/>`).join('');}}</script></body></html>"""
open("/tmp/seq.html", "w").write(html)
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={"width": 1080, "height": 1080}); pg.goto("file:///tmp/seq.html")
    for f in range(N):
        pg.evaluate(f"setT({f/(N-1)})")
        im = Image.open(io.BytesIO(pg.screenshot(clip={"x": 0, "y": 0, "width": 1080, "height": 1080}))).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        im.save(f"public/frames/f-{f}.webp", quality=80, method=6)
    b.close()
tot = sum(os.path.getsize(f"public/frames/f-{i}.webp") for i in range(N))
print(f"{N} frames, {tot/1e6:.1f} MB total, avg {tot/N/1e3:.0f} KB, layers {K}")
sheet = Image.new("RGB", (4 * 360, 2 * 360), "white")
for j, f in enumerate([0, 6, 14, 24, 34, 44, 56, 63]):
    sheet.paste(Image.open(f"public/frames/f-{f}.webp").resize((360, 360)), ((j % 4) * 360, (j // 4) * 360))
sheet.save("/tmp/contact.png")
