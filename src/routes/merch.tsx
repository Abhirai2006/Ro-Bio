import { createFileRoute } from "@tanstack/react-router";
import { PageIntro } from "@/components/site/parts";
import { MerchStudio } from "@/components/site/MerchStudio";
import { merch } from "@/lib/site";

export const Route = createFileRoute("/merch")({
  head: () => ({
    meta: [
      { title: "Merch drafts for members | RO-BIO" },
      // a draft for members, shared by link: kept out of search engines until the designs are final
      ...(merch.draft ? [{ name: "robots", content: "noindex, nofollow" }] : []),
      {
        name: "description",
        content:
          "Draft RO-BIO kit for members: a zip hoodie, a hoodie, a round neck tee and a polo in three colours. Turn each one in 3D, like your favourite and tell us what you think.",
      },
      { property: "og:title", content: "RO-BIO merch drafts" },
      {
        property: "og:description",
        content: "Spin the draft club kit in 3D, like your favourite and tell us what you think.",
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
        it, the college crest on one sleeve and a number on the other. Turn each piece around, try
        the colours, like the ones you would wear and tell us what to change.
      </PageIntro>
      <MerchStudio />
    </>
  );
}
