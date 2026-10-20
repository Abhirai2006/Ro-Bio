import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap">
      <h1>No signal</h1>
      <svg viewBox="0 0 300 40" width="300" height="40" role="img" aria-label="A flat heartbeat line" style={{ maxWidth: "100%" }}>
        <polyline points="0,20 300,20" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
      <p>This page does not exist. Here is a way back.</p>
      <p><Link className="btn" href="/">Back to the home page</Link></p>
    </div>
  );
}
