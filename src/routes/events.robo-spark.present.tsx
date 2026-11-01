import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { canonical } from "@/lib/seo";
import { STAGE_TEAMS, STAGE_TEAMS_MAX } from "@/lib/robo-spark";
import { judgeApi, readLogin, stageTeams, type Score } from "@/lib/judging";
import { mountDeck } from "@/deck/engine";
import { buildSlides, wireSetTeams } from "@/deck/slides";
import deckCss from "@/deck/deck.css?url";
import logo from "@/assets/robio-logo.jpg";

// The Robo Spark presentation, run live in the browser. The site header, footer and Robo stay off this page.
export const Route = createFileRoute("/events/robo-spark/present")({
  head: () => ({
    links: [
      canonical("/events/robo-spark/present"),
      { rel: "stylesheet", href: deckCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rubik+Mono+One&family=Nunito+Sans:wght@600;700;800&family=Silkscreen:wght@400;700&display=block",
      },
      { rel: "preload", as: "image", href: "/events/robo-spark/art-poster.webp" },
    ],
    meta: [
      { title: "Robo Spark presentation | RO-BIO" },
      {
        name: "description",
        content:
          "The slides for Robo Spark, RO-BIO's interactive group discussion for first years.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Present,
});

const assets = {
  logo,
  poster: "/events/robo-spark/art-poster.webp",
  girl: "/events/robo-spark/art-girl.webp",
  astronaut: "/events/robo-spark/art-astronaut.webp",
  sparkbot: "/events/robo-spark/art-sparkbot.webp",
};

/** The stage teams from the judges' ranking, if this laptop has the judge passcode saved. */
async function rankingTeams() {
  const login = readLogin();
  if (!login) throw new Error("No judge passcode in this browser.");
  const { scores } = await judgeApi<{ scores: Score[] }>(login.passcode, "scores");
  return stageTeams(scores, STAGE_TEAMS, STAGE_TEAMS_MAX);
}

function Present() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let stop = () => {};
    let unwire = () => {};
    let alive = true;
    // Wait for the fonts, so no slide flashes in a fallback font. Loading them all now also means the deck keeps working if the Wi-Fi drops later.
    const fonts = [
      "400 100px 'Rubik Mono One'",
      "700 40px Silkscreen",
      "400 40px Silkscreen",
      "800 40px 'Nunito Sans'",
      "700 40px 'Nunito Sans'",
    ];
    const ready = Promise.race([
      Promise.all(fonts.map((f) => document.fonts?.load(f))).catch(() => undefined),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    void ready.then(() => {
      if (!alive) return;
      stop = mountDeck(el, buildSlides(assets, { stageTeams: rankingTeams }), {
        exitHref: "/events/robo-spark",
        exitLabel: "Exit",
      });
      unwire = wireSetTeams(el);
    });
    return () => {
      alive = false;
      unwire();
      stop();
    };
  }, []);

  return (
    <div ref={host} className="rsd" aria-label="Robo Spark presentation">
      <p
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontFamily: "Silkscreen, monospace",
          color: "#6f5dff",
          fontSize: 24,
        }}
      >
        LOADING ROBO SPARK…
      </p>
    </div>
  );
}
