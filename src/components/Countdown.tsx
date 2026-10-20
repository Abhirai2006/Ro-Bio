"use client";
import { useEffect, useState } from "react";

// Whole calendar days to go, counted in India time.
function daysTo(iso: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

export default function Countdown({ date }: { date: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => setN(daysTo(date)), [date]);
  if (n === null) return <span className="count" aria-hidden="true">&nbsp;</span>;
  if (n < 0) return null;
  return <span className="count">{n > 1 ? `${n} days to go` : n === 1 ? "Tomorrow" : "Today"}</span>;
}
