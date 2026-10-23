import type { ReactNode } from "react";
import { PageIntro } from "@/components/site/parts";
import { LAST_UPDATED } from "@/lib/seo";

export function LegalPage({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <>
      <PageIntro label={label} title={title}>
        Last updated {LAST_UPDATED}.
      </PageIntro>
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-14 leading-relaxed [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </article>
    </>
  );
}
