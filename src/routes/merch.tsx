import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/parts";
import { MerchStudio } from "@/components/site/MerchStudio";
import { merch } from "@/lib/site";
import { canonical } from "@/lib/seo";

export const Route = createFileRoute("/merch")({
  head: () => ({
    // the fonts for the sleeve number styles, only on this page; the Japanese one only carries the numerals
    links: [
      ...(merch.draft ? [] : [canonical("/merch")]),
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Permanent+Marker&family=Potta+One&display=swap",
      },
      {
        rel: "stylesheet",
        href: `https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&text=${encodeURIComponent("零一二三四五六七八九十番魂")}&display=swap`,
      },
    ],
    // a draft for members, shared by link, stays out of search engines; the final kit is a public showcase
    meta: merch.draft
      ? [
          { title: "Merch drafts for members | RO-BIO" },
          { name: "robots", content: "noindex, nofollow" },
          {
            name: "description",
            content:
              "Draft RO-BIO kit for members: a zip hoodie, a hoodie, a round neck tee and a polo in three colours. Turn each one in 3D, like your favourite and tell us what you think.",
          },
          { property: "og:title", content: "RO-BIO merch drafts" },
          {
            property: "og:description",
            content:
              "Spin the draft club kit in 3D, like your favourite and tell us what you think.",
          },
        ]
      : [
          { title: "Merch | RO-BIO" },
          {
            name: "description",
            content:
              "The RO-BIO club kit in 3D: a zip hoodie, a hoodie, a round neck tee and a polo in three colours. Turn each piece, unzip the zip hoodie and try your own name and number.",
          },
          { property: "og:title", content: "RO-BIO merch" },
          {
            property: "og:description",
            content: "The club kit in 3D. Turn it, unzip it, put your name on it.",
          },
        ],
  }),
  component: Merch,
});

function Merch() {
  return (
    <>
      <PageIntro label={`RO-BIO KIT / ${merch.drop.toUpperCase()}`} title="Wear the club.">
        A zip hoodie, a hoodie, a round neck tee and a polo. The logo on the back with a name under
        it, the college crest on one sleeve and a number on the other.{" "}
        {merch.draft
          ? "Turn each piece around, try the colours, like the ones you would wear and tell us what to change."
          : "Turn each piece around, unzip the zip hoodie and try the colours with your own name and number."}
      </PageIntro>
      <MerchStudio />
    </>
  );
}
