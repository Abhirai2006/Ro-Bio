import type { ReactNode } from "react";

// Re-mounts on every navigation, so each page gets a short fade.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page">{children}</div>;
}
