// Compliance news for hrterrain.com.
// Pulls recent headlines from Google News RSS for each topic, merges and de-duplicates them,
// and returns JSON. Netlify's CDN caches the response for 6 hours, so the feeds are fetched
// a few times a day at most. No API keys, no paid services.

// each headline must match its topic's pattern, so loosely related stories are dropped
const TOPICS = [
  { tag: "EPF", q: 'EPFO OR "provident fund"', must: /\bEPFO?\b|provident fund/i },
  { tag: "ESI", q: 'ESIC OR "employees state insurance"', must: /\bESIC?\b|state insurance/i },
  { tag: "Labour codes", q: '"labour codes" OR "labour code"', must: /labou?r codes?/i },
  { tag: "Wages", q: '"minimum wages" notification OR revised', must: /minimum wage/i },
  { tag: "Payroll tax", q: '"TDS" salary OR CBDT OR "Form 16"', must: /\bTDS\b|CBDT|form 16|salar/i },
  { tag: "Kerala", q: 'Kerala "professional tax" OR "labour welfare" OR "minimum wages" OR "labour department"', must: /kerala/i, also: /tax|welfare|wage|labou?r|employ/i },
  { tag: "Karnataka", q: 'Karnataka "professional tax" OR "labour welfare" OR "minimum wages" OR "labour department"', must: /karnataka|bengaluru/i, also: /tax|welfare|wage|labou?r|employ/i },
  { tag: "POSH", q: '"POSH Act" OR "sexual harassment at workplace" OR "internal committee"', must: /\bPOSH\b|sexual harassment/i },
  { tag: "Apprentices", q: '"Apprentices Act" OR NATS apprenticeship OR NAPS apprenticeship OR "apprenticeship scheme" India', must: /apprentices act|\bNATS\b|\bNAPS\b|apprenticeship/i, also: /india|\bNATS\b|\bNAPS\b|apprentices act|MSDE|skill india|AICTE|board of (apprenticeship|practical) training/i }
];
const PER_TOPIC = 3, LIMIT = 12, MAX_AGE_DAYS = 45;

const decode = (t) => t
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
  .trim();
const pick = (xml, tag) => { const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">")); return m ? decode(m[1]) : ""; };
const key = (title) => title.toLowerCase().replace(/[^a-z0-9₹ ]/g, "").split(" ").slice(0, 7).join(" ");

async function topic({ tag, q, must, also }) {
  const url = "https://news.google.com/rss/search?q=" + encodeURIComponent(q + " when:30d") + "&hl=en-IN&gl=IN&ceid=IN:en";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; HRTerrainNews/1.0)" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, PER_TOPIC * 3).map((m) => {
      const it = m[1], source = pick(it, "source");
      let title = pick(it, "title");
      if (source && title.endsWith(" - " + source)) title = title.slice(0, -(source.length + 3));
      return { tag, title, source, url: pick(it, "link"), date: new Date(pick(it, "pubDate")).toISOString() };
    }).filter((n) => n.title && n.url && must.test(n.title) && (!also || also.test(n.title)));
  } catch { return []; }
}

export default async () => {
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5, seen = new Set(), out = [];
  const lists = (await Promise.all(TOPICS.map(topic))).map((list) =>
    list.filter((n) => new Date(n.date) >= cutoff).sort((a, b) => new Date(b.date) - new Date(a.date)));
  // round-robin across topics so one big story can't crowd out the rest
  for (let round = 0; round < PER_TOPIC && out.length < LIMIT; round++) {
    for (const list of lists) {
      while (list.length && out.length < LIMIT) {
        const item = list.shift(), k = key(item.title);
        if (seen.has(k)) continue;
        seen.add(k); out.push(item); break;
      }
    }
  }
  const items = out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return new Response(JSON.stringify({ updated: new Date().toISOString(), items }), {
    status: items.length ? 200 : 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": items.length ? "public, durable, s-maxage=21600, stale-while-revalidate=86400" : "no-store"
    }
  });
};

export const config = { path: "/api/news" };
