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
        <li>If your device asks for reduced motion, the typed text, the robot companion, the shaking in Robo Sumo and the decorative animations stop or are cut back.</li>
        <li>Robo Sumo can be played with the arrow keys or W, A, S and D, or with the on-screen buttons on a touch screen. Its messages are announced to screen readers.</li>
        <li>The robot companion's speech is announced to screen readers as it appears.</li>
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
