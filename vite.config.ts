import { defineConfig } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      // Our own server entry, src/server.ts, wraps rendering with a friendly error page.
      server: { entry: "server" },
      importProtection: { behavior: "error", client: { files: ["**/server/**"], specifiers: ["server-only"] } },
    }),
    viteReact(),
  ],
  // three.js (the 3D robot arm) is one big file by nature. It loads on its own after the page, so the warning is noise.
  build: { chunkSizeWarningLimit: 600 },
  resolve: {
    tsconfigPaths: true, // the "@/..." imports, read from tsconfig.json
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
});
