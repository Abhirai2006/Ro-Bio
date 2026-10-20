import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // OpenNext converts the standalone build for Cloudflare. Without this the
  // .next/standalone folder it reads does not exist.
  output: "standalone",
};
export default nextConfig;

initOpenNextCloudflareForDev();
