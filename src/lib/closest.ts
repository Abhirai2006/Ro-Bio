/** Every page on the site, for the "did you mean" on the 404 page. */
export const PAGES = ["/", "/about", "/events", "/events/bot-forge", "/workshops", "/projects", "/team", "/gallery", "/blog", "/contact", "/faq", "/privacy", "/terms", "/accessibility"];

/** How many single-letter edits turn a into b. */
export function editDistance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length]!;
}

/** The page someone probably meant, or null if nothing is close. Ignores case and a trailing slash. */
export function closestPage(path: string) {
  const p = path.toLowerCase().replace(/\/+$/, "") || "/";
  let best: string | null = null, score = Infinity;
  for (const page of PAGES) {
    const d = editDistance(p, page);
    if (d < score) [best, score] = [page, d];
  }
  return best && best !== p && score <= Math.max(2, Math.floor(best.length / 3)) ? best : null;
}
