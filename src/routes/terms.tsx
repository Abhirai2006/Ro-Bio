import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/legal";
import { canonical } from "@/lib/seo";
import { site } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use | RO-BIO" },
      { name: "description", content: "The rules for using the RO-BIO website: event details can change, demos are for learning, and the heartbeat and anatomy graphics are not medical advice." },
      { property: "og:title", content: "Terms of Use | RO-BIO" },
      { property: "og:description", content: "The rules for using the RO-BIO website: event details can change, demos are for learning, and the heartbeat and anatomy graphics are not medical advice." },
    ],
    links: [canonical("/terms")],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalPage label="LEGAL / TERMS" title="Terms of Use">
      <p>By using the RO-BIO website you agree to these terms. If you do not agree, please do not use the site.</p>

      <h2>Event information can change</h2>
      <p>Dates, venues, rules and registration details are our best current information and can change. Check the event page and our Instagram, <a href={site.instagram}>{site.instagramHandle}</a>, for the latest. Events have their own rules, announced on the event page. Please follow the instructions of the coordinators and the college.</p>

      <h2>Demos and games</h2>
      <p>The robot arm, the Robo Sumo game, Robo the roaming robot and other interactive parts of the site are for fun and learning. They are provided as they are, without promises that they will always work or work the same way on every device.</p>

      <h2>Not medical advice</h2>
      <p>The ECG, heart rate numbers and X-ray anatomy graphics are illustrations for education. They are not medical devices and they do not measure your body. Do not use them to make decisions about your health. If you have a health concern, speak to a qualified doctor.</p>

      <h2>Fair use of the site</h2>
      <ul>
        <li>Do not attack, overload or try to break into the site.</li>
        <li>Do not pretend to be RO-BIO or someone from the club.</li>
        <li>Search engines and AI assistants are welcome to read the site. Our robots.txt file says how.</li>
      </ul>

      <h2>Our content</h2>
      <p>The text, design, logo and artwork on this site belong to RO-BIO and its creators. You may quote short parts with a clear credit and a link back. Please do not reuse the logo or branding without asking us first.</p>

      <h2>Other websites</h2>
      <p>We link to other sites, such as Instagram, LinkedIn and Google Maps. We do not control them and are not responsible for what they do.</p>

      <h2>Limits on our responsibility</h2>
      <p>The site is run by students for a college community. To the extent the law allows, RO-BIO is not liable for losses that come from using the site or relying on what it says.</p>

      <h2>Law and contact</h2>
      <p>These terms are governed by the laws of India. Questions go to <a href={site.instagram}>{site.instagramHandle}</a> or through the <a href="/contact">Contact page</a>.</p>
    </LegalPage>
  );
}
