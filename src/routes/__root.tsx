import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JsonLd } from "@/components/site/JsonLd";
import { address } from "@/lib/seo";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { SiteFooter, SiteHeader } from "@/components/site/parts";
import { RoboLayer } from "@/components/site/RoboLayer";
import { BootScreen } from "@/components/site/BootScreen";
import { site } from "@/lib/site";

const orgLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization", "@id": `${site.url}/#org`, name: "RO-BIO", alternateName: "Ro-Bio Hub", url: site.url,
      logo: `${site.url}/favicon.png`, image: `${site.url}/og-image.png`,
      description: `RO-BIO is the student club for ${site.branch} at ${site.college}, Mysuru, India.`,
      foundingDate: site.startedOn, sameAs: [site.instagram], address,
      parentOrganization: { "@type": "CollegeOrUniversity", name: site.college, address },
    },
    { "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: "RO-BIO", inLanguage: "en-IN", publisher: { "@id": `${site.url}/#org` } },
  ],
};


function NotFoundComponent() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <svg viewBox="0 0 600 60" className="h-14 w-full text-primary" aria-hidden="true">
        <path d="M0 30 H600" stroke="currentColor" strokeWidth="3" />
      </svg>
      <p className="mt-6 font-pixel text-xs text-primary">ERROR 404 / FLATLINE</p>
      <h1 className="mt-3 text-4xl font-black">No signal on this page.</h1>
      <p className="mt-3 text-muted-foreground">Here is a way back.</p>
      <Link to="/" className="mt-8 inline-block border-2 border-border bg-primary px-5 py-3 font-bold text-primary-foreground shadow-hard">
        Back to home
      </Link>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something broke on our side. Try again or head home.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="border-2 border-border bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="border-2 border-border px-4 py-2 text-sm font-bold">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RO-BIO | Biomedical and Robotic Engineering club, MUSE Mysuru" },
      { name: "description", content: "RO-BIO is the student club of Biomedical and Robotic Engineering at Mysore University School of Engineering." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:site_name", content: "RO-BIO" },
      { property: "og:locale", content: "en_IN" },
      // WhatsApp, Instagram and Telegram previews need an absolute image URL under 300 KB with its size stated.
      { property: "og:image", content: `${site.url}/og-image.png` },
      { property: "og:image:secure_url", content: `${site.url}/og-image.png` },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "The RO-BIO logo: a robot in a space helmet over a wireframe globe" },
      { name: "twitter:image", content: `${site.url}/og-image.png` },
      { name: "theme-color", content: "#725dff" },
    ],
    links: [
      { rel: "alternate", type: "text/plain", href: "/llms.txt", title: "Summary for AI assistants" },
      { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Tektur:wght@400..900&family=Atkinson+Hyperlegible+Next:ital,wght@0,400..800;1,400..800&family=JetBrains+Mono:wght@400;600&family=Silkscreen&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        <HeadContent />
      </head>
      <body>
        <BootScreen />
        <JsonLd data={orgLd} />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
      <RoboLayer />
    </QueryClientProvider>
  );
}
