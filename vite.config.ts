import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * A short fingerprint of every file in public/merch. The merch page adds it to the links of the 3D jacket and its
 * prints, so browsers fetch a fresh copy the moment any of those files changes, and keep their cached copy otherwise.
 */
function merchVersion() {
  const hash = createHash("sha1");
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else hash.update(p).update(readFileSync(p));
    }
  };
  walk("public/merch");
  return hash.digest("hex").slice(0, 10);
}

// Vite passes VITE_ variables to the site code as import.meta.env
process.env["VITE_MERCH_V"] = merchVersion();

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      // Our own server entry, src/server.ts, wraps rendering with a friendly error page.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    viteReact(),
  ],
  // three.js (the 3D robot arm) is one big file by nature. It loads on its own after the page, so the warning is noise.
  build: { chunkSizeWarningLimit: 600 },
  resolve: {
    tsconfigPaths: true, // the "@/..." imports, read from tsconfig.json
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
});
