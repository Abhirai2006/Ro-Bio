import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Archivo } from "next/font/google";
import { SITE } from "@/lib/config/site";
import ThemeToggle from "@/components/ThemeToggle";
import "../styles/tokens.css";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-archivo" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.baseUrl),
  title: { default: "RO-BIO", template: "%s | RO-BIO" },
  description:
    "RO-BIO is the Biomedical and Robotic Engineering student club at Mysore University School of Engineering, Mysuru.",
  alternates: { canonical: "/" },
  openGraph: { siteName: "RO-BIO", locale: "en_IN", type: "website", images: [{ url: "/brand/logo.webp", width: 640, height: 640, alt: "RO-BIO logo" }] },
};

// Runs before paint so the saved theme never flashes. Light is the default.
const themeScript = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={archivo.variable} suppressHydrationWarning>
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
            <Link href="/about">About</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <ThemeToggle />
        </header>
        <main id="main">{children}</main>
        <footer className="wrap foot">
          <p>
            RO-BIO, Biomedical and Robotic Engineering, {SITE.parent}.{" "}
            <a href={SITE.instagram}>Instagram @ro_bio_hub</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
