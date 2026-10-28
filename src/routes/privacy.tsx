import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/site/legal";
import { canonical } from "@/lib/seo";
import { site } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | RO-BIO" },
      { name: "description", content: "What the RO-BIO website stores and shares: no accounts, no forms, no analytics, no cookies." },
      { property: "og:title", content: "Privacy Policy | RO-BIO" },
      { property: "og:description", content: "What the RO-BIO website stores and shares: no accounts, no forms, no analytics, no cookies." },
    ],
    links: [canonical("/privacy")],
  }),
  component: Page,
});

function Page() {
  return (
    <LegalPage label="LEGAL / PRIVACY" title="Privacy Policy">
      <p>This policy covers the RO-BIO website, the site of the {site.branch} student club at {site.college}, Mysuru. It is written in plain language on purpose.</p>

      <h2>The short version</h2>
      <p>We do not ask you for personal information on this site. There are no accounts, forms, comments or newsletters. We do not use analytics or advertising trackers, and the site does not set cookies.</p>

      <h2>What our hosting provider sees</h2>
      <p>The site is served by Cloudflare. When you open a page, Cloudflare processes technical details such as your IP address, browser type, the page you asked for and the time, so it can deliver the site and protect it from abuse. RO-BIO does not use this to identify or profile visitors.</p>

      <h2>What is stored in your browser</h2>
      <ul>
        <li><strong>robio-theme</strong> (local storage): remembers whether you chose the light or dark theme. It stays until you clear your browser data.</li>
        <li><strong>robo-woke</strong> (session storage): remembers that the robot on the home page has already woken up during this visit, so it does not repeat the whole routine. It disappears when you close the tab.</li>
        <li><strong>robio-boot</strong> (session storage): remembers that you have already seen the start-up screen during this visit, so it only plays once. It disappears when you close the tab.</li>
        <li><strong>robio-robo</strong> (local storage): remembers if you chose to rest or hide Robo, the robot that roams the site. It stays until you clear your browser data.</li>
      </ul>
      <p>None of these contains personal information, and none is sent to us.</p>

      <h2>Other companies involved</h2>
      <ul>
        <li><strong>Google Fonts.</strong> The site's fonts load from Google (fonts.googleapis.com and fonts.gstatic.com). Google receives your IP address and browser details when they load, under Google's own privacy policy.</li>
        <li><strong>Instagram and Google Maps.</strong> Links to them leave this site. Their policies apply from the moment you click.</li>
        <li><strong>Phone links.</strong> A phone number on the site opens your phone's dialler. Nothing is sent until you place the call.</li>
      </ul>
      <p>The Robo Sumo game can vibrate your device using your browser's vibration feature. Nothing about it is collected.</p>

      <h2>Information about our people</h2>
      <p>The Team page shows the name, semester and branch of each core team member. The Contact and event pages show the names and phone numbers of event coordinators so visitors can ask about events. Anyone listed can ask us to correct or remove their details at any time.</p>

      <h2>If we add registration later</h2>
      <p>Bot Forge registration is not open yet. Before we collect any personal information, we will update this policy to say what we collect, why, who can see it and how long we keep it.</p>

      <h2>Your rights</h2>
      <p>You can ask what we hold about you, ask us to correct or delete it, and withdraw any permission you gave. We handle personal data in line with Indian law, including the Digital Personal Data Protection Act, 2023, as it applies to us.</p>

      <h2>Children</h2>
      <p>This site is meant for a college audience. We do not knowingly collect personal information from children.</p>

      <h2>How to reach us</h2>
      <p>Send a message on Instagram, <a href={site.instagram}>{site.instagramHandle}</a>, or ask the faculty coordinator listed on the <a href="/contact">Contact page</a>.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top changes with it.</p>
    </LegalPage>
  );
}
