"""Traces reference/logo-source.jpg into stacked colour layers (SVG) and measures the match.
Usage: python3 scripts/trace_logo.py"""
import cv2, numpy as np, subprocess
SRC, SVG, PNG = "reference/logo-source.jpg", "brand/logo-color-layers.svg", "docs/logo/raster.png"
S, K = 3, 14  # trace at 3x for smoother edges, K colour clusters
img = cv2.imread(SRC); H, W = img.shape[:2]
PAL = {"FFFFFA": (250, 255, 255), "6294FF": (255, 148, 98), "A979FA": (250, 121, 169), "725DFF": (255, 93, 114), "201E2D": (45, 30, 32)}  # BGR
cv2.setRNGSeed(1)
_, _, cen = cv2.kmeans(np.float32(img.reshape(-1, 3)[::7]), K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, .5), 3, cv2.KMEANS_PP_CENTERS)
snap = {}
for i, c in enumerate(cen):  # snap to the palette only when almost identical
    n, dist = min(((n, np.linalg.norm(c - np.float32(b))) for n, b in PAL.items()), key=lambda x: x[1])
    snap[i] = (n, dist)
    if dist <= 12: cen[i] = PAL[n]
up = cv2.resize(img, (W * S, H * S), interpolation=cv2.INTER_CUBIC).astype(np.float32)
lab = np.empty((H * S, W * S), np.uint8)
for y in range(0, H * S, 100):
    blk = up[y:y + 100].reshape(-1, 1, 3)
    lab[y:y + 100] = ((blk - cen[None]) ** 2).sum(2).argmin(1).reshape(-1, W * S)
order = np.argsort(-np.bincount(lab.ravel(), minlength=K))
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="RO-BIO logo">']
rep = []
for n, k in enumerate(order):
    cs, _ = cv2.findContours((lab == k).astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = []
    for c in cs:
        if cv2.contourArea(c) < 9: continue
        a = cv2.approxPolyDP(c, 1.0, True)[:, 0, :] / S
        if len(a) >= 3: d.append("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in a) + "Z")
    h = "%02X%02X%02X" % tuple(int(v) for v in cen[k][::-1])
    out.append(f'<g id="layer-{n:02d}-{h}" fill="#{h}" stroke="#{h}" stroke-width="0.5" stroke-linejoin="round"><path fill-rule="evenodd" d="{" ".join(d)}"/></g>')
    rep.append(f"| layer-{n:02d} | #{h} | {len(d)} | nearest palette {snap[k][0]}, distance {snap[k][1]:.0f} |")
out.append("</svg>")
open(SVG, "w").write("\n".join(out))
import os
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:  # render the SVG file in a real browser
    br = pw.chromium.launch(); pg = br.new_page(viewport={"width": W, "height": H})
    pg.goto("file://" + os.path.abspath(SVG)); pg.screenshot(path=PNG); tool = "Chromium " + br.version; br.close()
r = cv2.resize(cv2.imread(PNG), (W, H)); d = np.abs(r.astype(int) - img.astype(int)).max(2)
cv2.imwrite("docs/logo/overlay-50.png", cv2.addWeighted(img, .5, r, .5, 0))
cv2.imwrite("docs/logo/difference-x4.png", np.clip(d * 4, 0, 255).astype(np.uint8))
p = {t: (d > t).mean() * 100 for t in (32, 64)}
open("docs/logo/match-report.md", "w").write(
    f"# Logo trace match report\n\nSource: `{SRC}` ({W}x{H}). Renderer: {tool}. Traced at {S}x, {K} colour layers.\n\n"
    f"Pixels differing by more than 32 (of 255) in any channel: {p[32]:.2f}%. More than 64: {p[64]:.2f}%.\n\n"
    "JPEG artefacts and edge anti-aliasing account for most of the difference. See `difference-x4.png` (differences shown 4x brighter).\n\n"
    "Not done yet: named animation groups (visor, lens, console and so on), hand cleanup of jagged nodes, halftone dots as clean shapes. "
    "This is a faithful colour trace, not yet the approved logo.\n\n| Layer | Colour | Shapes | Note |\n| --- | --- | --- | --- |\n" + "\n".join(rep) + "\n")
print(tool, p)
