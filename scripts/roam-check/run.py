"""Drives Robo through every behaviour in a real browser (needs python playwright) and prints PASS or FAIL for each.
See scripts/roam-check/build.mjs for how to start it."""
import time, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
URL = "http://localhost:8125/index.html"
shots, results, errors = [], [], []
def ok(name, cond, extra=""): results.append((bool(cond), name, extra)); print(("PASS " if cond else "FAIL ") + name + (" | " + str(extra) if extra else ""))
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(q="scale=3", **kw):
        ctx = b.new_context(viewport={"width": 1100, "height": 700}, **kw); pg = ctx.new_page()
        pg.on("pageerror", lambda e: errors.append(str(e))); pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        pg.goto(URL + "?" + q); pg.wait_for_function("window.__ready === true"); return pg
    def st(pg): return pg.evaluate("window.__robo.state()")
    def until(pg, f, timeout=12, step=0.04):
        t = time.time(); last = None
        while time.time() - t < timeout:
            last = st(pg)
            if f(last): return last
            time.sleep(step)
        return None
    def snap(pg, label, clip=None):
        pg.screenshot(path="/tmp/s.png", clip=clip or {"x": 0, "y": 0, "width": 1100, "height": 700}); im = Image.open("/tmp/s.png").convert("RGB"); shots.append((label, im.resize((550, 350))))

    # ---- T1: the wake-up
    pg = page(); seq = []; texts = []; shot_sleep = shot_yawn = False
    t0 = time.time()
    while time.time() - t0 < 14:
        s = st(pg)
        if not seq or seq[-1] != s["wake"]: seq.append(s["wake"])
        if s["msg"] and (not texts or texts[-1] != s["msg"]): texts.append(s["msg"])
        if s["wake"] == "sleep" and not shot_sleep and time.time() - t0 > 0.5: snap(pg, "1 asleep, bottom-left"); shot_sleep = True
        if s["wake"] == "yawn" and not shot_yawn: time.sleep(0.5); snap(pg, "2 yawning"); shot_yawn = True
        if s["mode"] == "free": break
        time.sleep(0.04)
    s = st(pg)
    ok("wake order: sleep, waking, sitting, standing, yawn, relax then free", seq == ["sleep", "waking", "sitting", "standing", "yawn", "relax"] and s["mode"] == "free", seq)
    ok("said his lines while waking", any("five more minutes" in t for t in texts) and any("yaaawn" in t for t in texts), texts[:4])

    # ---- T2: walking
    w = until(pg, lambda s: s["act"] == "walk" and s["view"] == "side", 25)
    ok("walks in side view", w is not None, w and (w["view"], round(w["x"])))
    if w:
        x0 = w["x"]; time.sleep(0.6); w2 = st(pg); snap(pg, "3 walking along the bottom")
        ok("x changes while walking", abs(w2["x"] - x0) > 5, (round(x0), round(w2["x"])))
        ok("feet on the ground while walking (floor or the heading he stands on)", w2["onPerch"] or abs(w2["y"] - (700 - 4)) < 2, (w2["onPerch"], round(w2["y"])))

    # ---- T3: hop onto a heading, stay anchored, fall when scrolled away
    pg.evaluate("document.getElementById('h2-1').scrollIntoView({block:'center'})"); time.sleep(0.3)
    pg.evaluate("window.__robo.goPerch(document.getElementById('h2-1'))")
    mid = until(pg, lambda s: s["act"] == "jump" and s["y"] < 640, 8); 
    if mid: snap(pg, "4 mid-jump toward a heading")
    on = until(pg, lambda s: s["onPerch"] and s["act"] != "jump", 10)
    top = pg.evaluate("document.getElementById('h2-1').getBoundingClientRect().top")
    ok("jumped onto the heading", on is not None and on["perchTag"] == "H2" and abs(on["y"] - top) < 3, on and (on["perchTag"], round(on["y"]), round(top)))
    if on:
        snap(pg, "5 standing on a heading")
        pg.mouse.wheel(0, 120); time.sleep(0.5); s2 = st(pg); top2 = pg.evaluate("document.getElementById('h2-1').getBoundingClientRect().top")
        ok("stays on the heading while the page scrolls", s2["onPerch"] and abs(s2["y"] - top2) < 3, (round(s2["y"]), round(top2)))
        pg.evaluate("window.scrollTo(0, 2400)"); fell = until(pg, lambda s: not s["onPerch"] and s["act"] != "jump" and abs(s["y"] - 696) < 3, 6)
        ok("drops to the floor when the heading scrolls out of view", fell is not None, fell and round(fell["y"]))

    # ---- T4: clicking a link
    pg.evaluate("window.scrollTo(0, 0)"); pg.evaluate("window.__robo.setRest(false)"); time.sleep(0.4)
    pg.evaluate("window.__st = []; setInterval(() => { const s = window.__robo.state().travel; if (s && window.__st[window.__st.length - 1] !== s) window.__st.push(s); }, 8)")
    stages = []; pg.click("#navTeam", no_wait_after=True); t0 = time.time(); got_in = got_out = False; done = None
    while time.time() - t0 < 10:
        s = st(pg)
        if s["travel"] and (not stages or stages[-1] != s["travel"]): stages.append(s["travel"])
        if s["travel"] == "in" and not got_in: time.sleep(0.1); snap(pg, "6 jumping into the link"); got_in = True
        if s["travel"] == "out" and not got_out: time.sleep(0.12); snap(pg, "7 popping out on the new page"); got_out = True
        if s["mode"] == "free" and not s["travel"] and stages: done = s; break
        time.sleep(0.03)
    stages = pg.evaluate("window.__st")
    ok("trip stages: leap, in, wait, out, drop", stages == ["leap", "in", "wait", "out", "drop"], stages)
    ok("landed on the new page's heading", done and done["onPerch"] and done["perchTag"] == "H1", done and (done["perchTag"], done["onPerch"]))
    ok("page changed to /team", pg.evaluate("location.pathname") == "/team")
    time.sleep(0.4); ok("greeted the new page", "team" in (st(pg)["msg"] or "").lower(), st(pg)["msg"])
    if done: snap(pg, "8 greeting on the Team page")

    # ---- T5: pick him up and drop him on a card
    pg.evaluate("document.getElementById('card1').scrollIntoView({block:'center'})"); time.sleep(0.6)
    until(pg, lambda s: s["mode"] == "free" and s["act"] in (None, "wait", "walk"), 6)
    hb = pg.evaluate("(() => { const r = document.getElementById('hit').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
    cb = pg.evaluate("(() => { const r = document.getElementById('card1').getBoundingClientRect(); return [r.x + r.width / 2, r.y + 30, r.top]; })()")
    pg.mouse.move(hb[0], hb[1]); pg.mouse.down(); pg.mouse.move(hb[0], hb[1] - 30, steps=3)
    held = until(pg, lambda s: s["mode"] == "carried", 2); pg.mouse.move(cb[0], cb[1], steps=10); time.sleep(0.15)
    if held: snap(pg, "9 being carried")
    pg.mouse.up(); landed = until(pg, lambda s: s["onPerch"] and s["mode"] == "free" and s["act"] != "jump", 6)
    top = pg.evaluate("document.getElementById('card1').getBoundingClientRect().top")
    ok("can be picked up", held is not None)
    ok("dropped onto the card he was held over", landed is not None and landed["perchTag"] == "DIV" and abs(landed["y"] - top) < 3, landed and (landed["perchTag"], round(landed["y"]), round(top)))

    # ---- T6: never block the game zone
    pg.evaluate("document.getElementById('avoid').scrollIntoView({block:'end'})"); time.sleep(0.5)
    st0 = until(pg, lambda s: s["mode"] == "free", 3)
    hb = pg.evaluate("(() => { const r = document.getElementById('hit').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()")
    pg.mouse.move(hb[0], hb[1]); pg.mouse.down(); pg.mouse.move(550, 600, steps=8); pg.mouse.up(); time.sleep(0.2)
    fl = until(pg, lambda s: not s["onPerch"] and s["act"] != "jump" and s["mode"] == "free", 5); time.sleep(0.5)
    print("   (after drop: ", fl and (fl["onPerch"], round(fl["x"]), round(fl["y"])), ")")
    pe = pg.evaluate("document.getElementById('hit').style.pointerEvents")
    ok("his click area switches off in front of a game", pe == "none", pe)
    snap(pg, "10 in front of the game zone")

    # ---- T7: rest
    pg.evaluate("window.scrollTo(0, 0)"); pg.evaluate("window.__robo.setRest(true)"); time.sleep(0.8)
    xa = st(pg)["x"]; time.sleep(1.5); xb = st(pg)["x"]
    ok("rest: he sits still", abs(xa - xb) < 1, (round(xa), round(xb))); snap(pg, "11 resting")
    pg.evaluate("window.__robo.setRest(false)"); moved = until(pg, lambda s: s["act"] is not None and not s["rest"], 6)
    ok("rest off: he gets going again", moved is not None)

    # ---- T11: the X-ray scan
    pg.evaluate("window.scrollTo(0, 0)"); pg.evaluate("window.__robo.emote('xray')"); a = until(pg, lambda s: s["act"] == "xray", 3); time.sleep(1.1)
    xon = pg.evaluate("document.querySelector('#front svg').getAttribute('data-x')"); snap(pg, "13 X-ray scan")
    ok("X-ray scan shows the anatomy, then switches off", a is not None and xon == "1")
    done = until(pg, lambda s: s["act"] != "xray", 6); xoff = pg.evaluate("document.querySelector('#front svg').getAttribute('data-x')")
    ok("X-ray switches itself off afterwards", done is not None and xoff == "0", xoff)

    # ---- T9: arriving without a click (back button)
    pg.evaluate("history.pushState({}, '', '/contact'); document.getElementById('main').innerHTML='<h1 id=\"h1\">Contact</h1>'")
    pg.evaluate("window.__robo.onRoute('/contact')"); drop = until(pg, lambda s: s["travel"] in ("out", "drop"), 5)
    fin = until(pg, lambda s: s["mode"] == "free" and not s["travel"], 6)
    ok("arrives on the new page without a click too", drop is not None and fin is not None)
    pg.context.close()

    # ---- T10: returning visitor walks in from the edge
    pg = page("scale=3&seen=1"); s0 = st(pg); time.sleep(1.6); s1 = st(pg)
    ok("returning visitor starts off-screen and walks in", s0["mode"] == "free" and s0["x"] < 0 and s1["x"] > s0["x"] + 40, (round(s0["x"]), round(s1["x"])))
    pg.context.close()

    # ---- T8: reduced motion
    pg = page("scale=3&reduced=1", reduced_motion="reduce"); s0 = st(pg); time.sleep(1.5); s1 = st(pg)
    ok("reduced motion: he stays put, standing in the corner", s0["mode"] == "static" and abs(s0["x"] - s1["x"]) < 1 and s0["x"] > 900, (s0["mode"], round(s0["x"])))
    pg.click("#navTeam", no_wait_after=True); time.sleep(0.6)
    ok("reduced motion: no running trip on a link click", st(pg)["travel"] is None and pg.evaluate("location.pathname") == "/team")
    snap(pg, "12 reduced motion: still, in the corner")
    pg.context.close(); b.close()

print("\nJS errors:", errors or "none")
W, H = 550, 350; cols = 3; rows = (len(shots) + cols - 1) // cols
sheet = Image.new("RGB", (W * cols, (H + 18) * rows), "white"); d = ImageDraw.Draw(sheet)
for i, (lab, im) in enumerate(shots):
    x, y = (i % cols) * W, (i // cols) * (H + 18); sheet.paste(im, (x, y + 18)); d.text((x + 4, y + 3), lab, fill="black")
sheet.save("/tmp/rt-sheet.png"); print("screenshots: /tmp/rt-sheet.png")
print(f"\n{sum(1 for r in results if r[0])}/{len(results)} checks passed")
