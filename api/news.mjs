// Compliance news for hrterrain.com.
// Pulls recent headlines from Google News RSS for each topic, merges and de-duplicates them,
// and returns JSON. Vercel's CDN caches the response for 6 hours, so the feeds are fetched
// a few times a day at most. No API keys, no paid services.

// Only news that changes what an employer must do: a new rule, rate, ceiling, deadline, notification or enforcement.
// Each headline must match its topic (must), report a change (CHANGE), and not hit DROP.
const CHANGE = /notif|amend|revis|hike|increas|raise|reduc|cut|extend|extension|deadline|due date|last date to file|ceiling|threshold|limit|new rule|rules? (?:notified|issued|framed|come|take)|circular|implement|w\.?e\.?f|effective|from (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d)|mandatory|compulsory|penalt|fine[sd]?\b|damages|crackdown|order[s]? employers|directs?|exempt|amnesty|scheme launched|portal|ECR|UAN|KYC|rate[s]? (?:revised|notified|hiked|cut)|slab/i;
const TOPICS = [
  { tag: "EPF", q: 'EPFO employers OR circular OR "wage ceiling" OR notification OR deadline', must: /\bEPFO?\b|provident fund/i },
  { tag: "ESI", q: 'ESIC employers OR circular OR "wage ceiling" OR coverage OR notification', must: /\bESIC?\b|state insurance/i },
  { tag: "Labour codes", q: '"labour codes" rules notified OR implementation OR employers', must: /labou?r codes?|code on (?:wages|social security)|OSH code|industrial relations code/i },
  { tag: "Wages", q: '"minimum wages" notification OR revised OR "variable dearness allowance"', must: /minimum wage|dearness allowance|\bVDA\b/i },
  { tag: "Payroll tax", q: '"TDS on salary" OR "Form 16" OR "Form 130" OR "Form 24Q" OR "Form 138" employers deadline OR notified', must: /\bTDS\b|form (16|130|24Q|138)/i },
  { tag: "Professional tax", q: '"professional tax" employers OR slab OR "due date" OR amendment OR notification', must: /professional tax|profession tax|\bPTRC\b/i },
  { tag: "State rules", q: '"labour welfare fund" OR "shops and establishments" OR "state labour code rules" employers', must: /welfare fund|shops and (commercial )?establishments?|labou?r code rules/i },
  { tag: "POSH", q: '"POSH Act" employers OR mandatory OR "annual report" OR penalty OR guidelines', must: /\bPOSH\b|sexual harassment/i }
];
// events, PR, job adverts, partnerships, personal-finance stories and tax news that isn't about salaries
const DROP = /\?\s*$|\breviews?\b|meeting|chairs?\b|visits?\b|minister (?:says|urges|calls)|panel formed|committee formed|constitut|district (?:collector|officer|administration)|^(?:how|what|why|when|who|does|do|can|is|are|should)\b|questions|explained|explainer|beyond|opinion|column|analysis|lessons|tips|myths|everything you need|apprentic|recruit|vacanc|apply online|apply by|\bapply\b|eligibility|last date|admit card|\bexam|syllabus|\bjobs?\b|hiring|partners? with|partnership|\bMoU\b|tie[- ]up|training|skilling|\bher\b|\bhis\b|refund|\bseeks?\b|demand|protest|strike|agitation|workshop|sensiti[sz]ation|awareness|seminar|webinar|campaign|felicitat|inaugurat|conclave|summit|quiz|\bheld\b|celebrat|property|real estate|non-resident|NRI|crypto|\bGST\b|mutual fund|stock|share price|reaches .* crore people|health security reaches/i;
const PER_TOPIC = 2, LIMIT = 12, MAX_AGE_DAYS = 45;

const decode = (t) => t
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
  .trim();
const pick = (xml, tag) => { const m = xml.match(new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">")); return m ? decode(m[1]) : ""; };
const words = (title) => new Set(title.toLowerCase().replace(/[^a-z0-9₹ ]/g, " ").split(/\s+/).filter((w) => w.length > 2));
// the same story from two outlets: most of the meaningful words overlap
const same = (a, b) => { let n = 0; a.forEach((w) => { if (b.has(w)) n++; }); return n / Math.min(a.size, b.size) >= 0.6; };

async function topic({ tag, q, must }) {
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
    }).filter((n) => n.title && n.url && must.test(n.title) && CHANGE.test(n.title) && !DROP.test(n.title));
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
