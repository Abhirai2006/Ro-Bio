# Writes src/lib/cert-metrics.ts: how wide each letter is in the certificate fonts, so a long name
# can be shrunk to fit the same way on the server, in the browser and in the bulk PDF script.
# Run from the repo root after changing a font in public/fonts/cert/:
#   pip install fonttools brotli
#   python3 scripts/build-cert-metrics.py
from fontTools.ttLib import TTFont

FONTS = {
    "cormorantItalic": "cormorant-500-italic",
    "rubikMono": "rubik-mono-one",
    "silkscreen": "silkscreen-400",
    "silkscreenBold": "silkscreen-700",
    "cinzel": "cinzel-700",
}

out = [
    "// Made by scripts/build-cert-metrics.py from the fonts in public/fonts/cert/. Do not edit by hand.",
    "// Each string lists the advance width (per 1000 units of font size) of the characters from",
    "// code 32 to 255, separated by commas. An empty entry means the font has no such letter.",
    "export const CERT_METRICS = {",
]
for key, name in FONTS.items():
    font = TTFont(f"public/fonts/cert/{name}.woff2")
    scale = 1000 / font["head"].unitsPerEm
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    widths = []
    for code in range(32, 256):
        glyph = cmap.get(code)
        widths.append("" if glyph is None else str(round(hmtx[glyph][0] * scale)))
    out.append(f'  {key}:\n    "{",".join(widths)}",')
out.append("} as const;")
out.append("")
with open("src/lib/cert-metrics.ts", "w") as f:
    f.write("\n".join(out))
