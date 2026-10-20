import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { SITE } from "@/lib/config/site";
import ThemeToggle from "@/components/ThemeToggle";
import "../styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.baseUrl),
  title: { default: "RO-BIO", template: "%s | RO-BIO" },
  description:
    "RO-BIO is the Biomedical and Robotics Engineering student club at Mysore University School of Engineering, Mysuru.",
  openGraph: { siteName: "RO-BIO", locale: "en_IN", type: "website" },
};

// Runs before paint so the saved theme never flashes. Light is the default.
const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="bar">
          <Link href="/" className="brand">
            <img src="/brand/logo.webp" alt="" width={44} height={44} />
            <span>RO-BIO</span>
          </Link>
          <nav aria-label="Main">
            <Link href="/">Home</Link>
            <Link href="/events">Events</Link>
          </nav>
          <ThemeToggle />
        </header>
        <main id="main">{children}</main>
        <footer className="wrap foot">
          <p>
            RO-BIO, Biomedical and Robotics Engineering, {SITE.parent}.{" "}
            <a href={SITE.instagram}>Instagram @ro_bio_hub</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
