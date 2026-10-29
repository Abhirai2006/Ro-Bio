import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/legal";
import { canonical } from "@/lib/seo";
import { site } from "@/lib/site";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility Statement | RO-BIO" },
      { name: "description", content: "How accessible the RO-BIO website is, what works, what does not yet, and how to tell us about problems." },
      { property: "og:title", content: "Accessibility Statement | RO-BIO" },
      { property: "og:description", content: "How accessible the RO-BIO website is, what works, what does not yet, and how to tell us about problems." },
    ],
    links: [canonical("/accessibility")],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalPage label="LEGAL / ACCESSIBILITY" title="Accessibility Statement">
      <p>We want everyone to be able to use the RO-BIO website. We aim to meet WCAG 2.2 level AA. We have not had a formal accessibility audit yet, so please treat the points below as our honest current picture.</p>

      <h2>What works</h2>
      <ul>
        <li>A skip link lets keyboard users jump past the header to the main content.</li>
        <li>Pages use headings, landmarks and text alternatives for images and graphics.</li>
        <li>There is a light and a dark theme.</li>
        <li>If your device asks for reduced motion, the intro is skipped, Robo stops roaming and travelling between pages, and the typed text, the shaking in Robo Sumo and the decorative animations stop or are cut back.</li>
        <li>The intro on the first visit has a "Skip intro" button and also closes with Esc or Enter. It never traps you.</li>
        <li>The venue map only loads when you press "Show the map", and the address is always written out as text next to it.</li>
        <li>Robo Sumo can be played with the arrow keys or W, A, S and D, or with the on-screen buttons on a touch screen. Its messages are announced to screen readers.</li>
        <li>Robo, the robot that roams the site, announces what it says to screen readers. A "Rest Robo" button is always on screen at the bottom right and stops Robo moving. "Hide" removes Robo completely, and the choice is remembered. Robo can be opened with the keyboard: it is a button at the end of each page.</li>
        <li>Robo never blocks the games. It cannot be clicked while it stands in front of one.</li>
      </ul>

      <h2>What does not work yet</h2>
      <ul>
        <li>The robot arm toy on the home page needs a mouse or touch. It cannot be operated by keyboard yet.</li>
        <li>The games need quick reactions and fine control, which not everyone has.</li>
        <li>The live ECG, the robot companion and the X-ray view are decorative. Their meaning is also given in text, but the visuals themselves are not described in detail.</li>
        <li>We have not yet checked every colour pairing against WCAG contrast rules.</li>
      </ul>

      <h2>Tell us about a problem</h2>
      <p>If something here stops you from using the site, message us on Instagram, <a href={site.instagram}>{site.instagramHandle}</a>, or ask one of the coordinators on the <a href="/contact">Contact page</a>. Tell us the page, what you tried and what device or assistive technology you use. We will try to fix it quickly.</p>
    </LegalPage>
  );
}
