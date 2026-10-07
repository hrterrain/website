// Compliance news for hrterrain.com.
// Pulls recent headlines from Google News RSS for each topic, merges and de-duplicates them,
// and returns JSON. Vercel's CDN caches the response for 6 hours, so the feeds are fetched
// a few times a day at most. No API keys, no paid services.

// Only news an employer's HR / payroll / compliance team would act on.
// Each headline must match its topic (must), carry a compliance signal (also), and not hit DROP.
const SIGNAL = /contribut|ceiling|wage|salar|employer|deadline|due date|extend|extension|circular|notif|amend|rule|rate|limit|threshold|penalt|damages|interest|return|filing|ECR|UAN|KYC|withdraw|claim|pension|registration|coverage|cover|comply|complian|court|order|scheme|amnesty|revis|hike|increase|implement|draft|mandatory|exempt/i;
const TOPICS = [
  { tag: "EPF", q: 'EPFO OR "provident fund" employer OR contribution OR ceiling OR circular', must: /\bEPFO?\b|provident fund/i, also: SIGNAL },
  { tag: "ESI", q: 'ESIC contribution OR employer OR "wage ceiling" OR circular OR coverage', must: /\bESIC?\b|state insurance/i, also: SIGNAL },
  { tag: "Labour codes", q: '"labour codes" rules OR notified OR employers OR implementation', must: /labou?r codes?/i, also: SIGNAL },
  { tag: "Wages", q: '"minimum wages" notification OR revised OR "variable dearness allowance"', must: /minimum wage|dearness allowance|\bVDA\b/i, also: /notif|revis|hike|increase|court|order|implement|defer|stay|employer|rate/i },
  { tag: "Payroll tax", q: '"TDS on salary" OR "salary TDS" OR "Form 16" OR "Form 130" OR "Form 24Q" OR "Form 138"', must: /\bTDS\b|form (16|130|24Q|138)/i, also: /salar|employer|employee|form (16|130|24Q|138)|payroll/i },
  { tag: "Professional tax", q: '"professional tax" employers OR slab OR "due date" OR amendment OR notification', must: /professional tax|profession tax|\bPTRC\b/i, also: SIGNAL },
  { tag: "State rules", q: '"labour welfare fund" OR "shops and establishments" OR "state labour code rules" employers', must: /welfare fund|shops and (commercial )?establishments?|labou?r code rules/i, also: SIGNAL },
  { tag: "POSH", q: '"POSH Act" employer OR compliance OR "internal committee" OR "high court" OR "supreme court"', must: /\bPOSH\b|sexual harassment/i, also: /employer|compan|internal committee|\bIC\b|court|complian|penalt|order|guideline|mandatory|annual report/i },
  { tag: "Apprentices", q: '"Apprentices Act" OR NATS apprenticeship OR NAPS apprenticeship OR "apprenticeship scheme" India', must: /apprentices act|\bNATS\b|\bNAPS\b|apprenticeship/i, also: /stipend|employer|establishment|scheme|rule|amend|portal|mandatory|notif/i }
];
// events, PR and tax news that isn't about salaries
const DROP = /\bseeks?\b|demand|protest|strike|agitation|workshop|sensiti[sz]ation|awareness|seminar|webinar|campaign|felicitat|inaugurat|conclave|summit|quiz|\bheld\b|celebrat|property|real estate|non-resident|NRI|crypto|\bGST\b|mutual fund|stock|share price|reaches .* crore people|health security reaches/i;
const PER_TOPIC = 3, LIMIT = 12, MAX_AGE_DAYS = 45;

const decode = (t) => t
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
  .trim();
const pick = (xml, tag) => { const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">")); return m ? decode(m[1]) : ""; };
const words = (title) => new Set(title.toLowerCase().replace(/[^a-z0-9₹ ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
// the same story from two outlets: most of the meaningful words overlap
const same = (a, b) => { let n = 0; a.forEach((w) => { if (b.has(w)) n++; }); return n / Math.min(a.size, b.size) >= 0.6; };

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
    }).filter((n) => n.title && n.url && must.test(n.title) && (!also || also.test(n.title)) && !DROP.test(n.title));
  } catch { return []; }
}

export async function GET() {
  const cutoff = Date.now() - MAX_AGE_DAYS * 864e5, seen = [], out = [];
  const lists = (await Promise.all(TOPICS.map(topic))).map((list) =>
    list.filter((n) => new Date(n.date) >= cutoff).sort((a, b) => new Date(b.date) - new Date(a.date)));
  // round-robin across topics so one big story can't crowd out the rest
  for (let round = 0; round < PER_TOPIC && out.length < LIMIT; round++) {
    for (const list of lists) {
      while (list.length && out.length < LIMIT) {
        const item = list.shift(), w = words(item.title);
        if (seen.some((s) => same(s, w))) continue;
        seen.push(w); out.push(item); break;
      }
    }
  }
  const items = out.sort((a, b) => new Date(b.date) - new Date(a.date));
  return new Response(JSON.stringify({ updated: new Date().toISOString(), items }), {
    status: items.length ? 200 : 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Vercel-CDN-Cache-Control": items.length ? "s-maxage=21600, stale-while-revalidate=86400" : "no-store"
    }
  });
}
