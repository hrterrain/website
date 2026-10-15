<?php
// Compliance news for hrterrain.com — the Hostinger (PHP) twin of api/news.mjs.
// Pulls recent headlines from Google News RSS for each topic, merges and de-duplicates them,
// and returns JSON. The result is cached on disk for 6 hours, so the feeds are fetched
// a few times a day at most. No API keys, no paid services.
// .htaccess maps /api/news to this file. Keep the topic and filter lists in step with news.mjs.

ini_set('display_errors', '0');   // a PHP notice must never corrupt the JSON

const CACHE_FILE = __DIR__ . '/../.cache/news.json';
const FRESH_FOR = 21600;   // 6 hours
const STALE_FOR = 86400;   // serve an older copy for up to a day if Google News is unreachable

// Only news that changes what an employer must do: a new rule, rate, ceiling, deadline, notification or enforcement.
// Each headline must match its topic (must), report a change (CHANGE), and not hit DROP.
const CHANGE = '/notif|amend|revis|hike|increas|raise|reduc|cut|extend|extension|deadline|due date|last date to file|ceiling|threshold|limit|new rule|rules? (?:notified|issued|framed|come|take)|circular|implement|w\.?e\.?f|effective|from (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d)|mandatory|compulsory|penalt|fine[sd]?\b|damages|crackdown|order[s]? employers|directs?|exempt|amnesty|scheme launched|portal|ECR|UAN|KYC|rate[s]? (?:revised|notified|hiked|cut)|slab/i';
const TOPICS = [
  ['tag' => 'EPF', 'q' => 'EPFO employers OR circular OR "wage ceiling" OR notification OR deadline', 'must' => '/\bEPFO?\b|provident fund/i'],
  ['tag' => 'ESI', 'q' => 'ESIC employers OR circular OR "wage ceiling" OR coverage OR notification', 'must' => '/\bESIC?\b|state insurance/i'],
  ['tag' => 'Labour codes', 'q' => '"labour codes" rules notified OR implementation OR employers', 'must' => '/labou?r codes?|code on (?:wages|social security)|OSH code|industrial relations code/i'],
  ['tag' => 'Wages', 'q' => '"minimum wages" notification OR revised OR "variable dearness allowance"', 'must' => '/minimum wage|dearness allowance|\bVDA\b/i'],
  ['tag' => 'Payroll tax', 'q' => '"TDS on salary" OR "Form 16" OR "Form 130" OR "Form 24Q" OR "Form 138" employers deadline OR notified', 'must' => '/\bTDS\b|form (16|130|24Q|138)/i'],
  ['tag' => 'Professional tax', 'q' => '"professional tax" employers OR slab OR "due date" OR amendment OR notification', 'must' => '/professional tax|profession tax|\bPTRC\b/i'],
  ['tag' => 'State rules', 'q' => '"labour welfare fund" OR "shops and establishments" OR "state labour code rules" employers', 'must' => '/welfare fund|shops and (commercial )?establishments?|labou?r code rules/i'],
  ['tag' => 'POSH', 'q' => '"POSH Act" employers OR mandatory OR "annual report" OR penalty OR guidelines', 'must' => '/\bPOSH\b|sexual harassment/i'],
];
// events, PR, job adverts, partnerships, personal-finance stories and tax news that isn't about salaries
const DROP = '/\?\s*$|\breviews?\b|meeting|chairs?\b|visits?\b|minister (?:says|urges|calls)|panel formed|committee formed|constitut|district (?:collector|officer|administration)|^(?:how|what|why|when|who|does|do|can|is|are|should)\b|questions|explained|explainer|beyond|opinion|column|analysis|lessons|tips|myths|everything you need|apprentic|recruit|vacanc|apply online|apply by|\bapply\b|eligibility|last date|admit card|\bexam|syllabus|\bjobs?\b|hiring|partners? with|partnership|\bMoU\b|tie[- ]up|training|skilling|\bher\b|\bhis\b|refund|\bseeks?\b|demand|protest|strike|agitation|workshop|sensiti[sz]ation|awareness|seminar|webinar|campaign|felicitat|inaugurat|conclave|summit|quiz|\bheld\b|celebrat|property|real estate|non-resident|NRI|crypto|\bGST\b|mutual fund|stock|share price|reaches .* crore people|health security reaches/i';
const PER_TOPIC = 2, LIMIT = 12, MAX_AGE_DAYS = 45;

function decode($t) {
  $t = preg_replace('/<!\[CDATA\[([\s\S]*?)\]\]>/', '$1', $t);
  return trim(str_replace(['&amp;', '&lt;', '&gt;', '&quot;', '&#39;', '&apos;', '&nbsp;'], ['&', '<', '>', '"', "'", "'", ' '], $t));
}
function pick($xml, $tag) { return preg_match('/<' . $tag . '[^>]*>([\s\S]*?)<\/' . $tag . '>/', $xml, $m) ? decode($m[1]) : ''; }
function words($title) {
  $w = preg_split('/\s+/', preg_replace('/[^a-z0-9₹ ]/u', ' ', strtolower($title)), -1, PREG_SPLIT_NO_EMPTY);
  return array_values(array_unique(array_filter($w, fn($x) => mb_strlen($x) > 2)));
}
// the same story from two outlets: most of the meaningful words overlap
function same($a, $b) {
  $min = min(count($a), count($b));
  return $min > 0 && count(array_intersect($a, $b)) / $min >= 0.6;
}

function fetch_all() {
  $mh = curl_multi_init(); $handles = [];
  foreach (TOPICS as $i => $t) {
    $url = 'https://news.google.com/rss/search?q=' . rawurlencode($t['q'] . ' when:30d') . '&hl=en-IN&gl=IN&ceid=IN:en';
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 8,
      CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; HRTerrainNews/1.0)']);
    curl_multi_add_handle($mh, $ch); $handles[$i] = $ch;
  }
  do { $status = curl_multi_exec($mh, $running); if ($running) curl_multi_select($mh); } while ($running && $status === CURLM_OK);
  $lists = [];
  foreach (TOPICS as $i => $t) {
    $ch = $handles[$i]; $xml = curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200 ? curl_multi_getcontent($ch) : '';
    curl_multi_remove_handle($mh, $ch);
    $list = [];
    preg_match_all('/<item>([\s\S]*?)<\/item>/', (string)$xml, $m);
    foreach (array_slice($m[1], 0, PER_TOPIC * 3) as $it) {
      $source = pick($it, 'source'); $title = pick($it, 'title');
      if ($source && str_ends_with($title, ' - ' . $source)) $title = substr($title, 0, -(strlen($source) + 3));
      $ts = strtotime(pick($it, 'pubDate'));
      $n = ['tag' => $t['tag'], 'title' => $title, 'source' => $source, 'url' => pick($it, 'link'), 'date' => $ts ? gmdate('Y-m-d\TH:i:s.000\Z', $ts) : ''];
      if ($n['title'] && $n['url'] && $ts && preg_match($t['must'], $title) && preg_match(CHANGE, $title) && !preg_match(DROP, $title)) $list[] = $n;
    }
    $lists[] = $list;
  }
  curl_multi_close($mh);
  return $lists;
}

function build() {
  $cutoff = time() - MAX_AGE_DAYS * 86400; $seen = []; $out = [];
  $lists = array_map(function ($list) use ($cutoff) {
    $list = array_values(array_filter($list, fn($n) => strtotime($n['date']) >= $cutoff));
    usort($list, fn($a, $b) => strcmp($b['date'], $a['date']));
    return $list;
  }, fetch_all());
  // round-robin across topics so one big story can't crowd out the rest
  for ($round = 0; $round < PER_TOPIC && count($out) < LIMIT; $round++) {
    foreach ($lists as &$list) {
      while ($list && count($out) < LIMIT) {
        $item = array_shift($list); $w = words($item['title']);
        foreach ($seen as $s) if (same($s, $w)) continue 2;
        $seen[] = $w; $out[] = $item; break;
      }
    }
    unset($list);
  }
  usort($out, fn($a, $b) => strcmp($b['date'], $a['date']));
  return ['updated' => gmdate('Y-m-d\TH:i:s.000\Z'), 'items' => $out];
}

header('Content-Type: application/json; charset=utf-8');
$age = is_file(CACHE_FILE) ? time() - filemtime(CACHE_FILE) : PHP_INT_MAX;
if ($age < FRESH_FOR) {
  header('Cache-Control: public, max-age=' . (FRESH_FOR - $age));
  readfile(CACHE_FILE); exit;
}
$data = build();
if ($data['items']) {
  $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  @mkdir(dirname(CACHE_FILE), 0755, true);
  @file_put_contents(CACHE_FILE . '.tmp', $json) && @rename(CACHE_FILE . '.tmp', CACHE_FILE);
  header('Cache-Control: public, max-age=' . FRESH_FOR);
  echo $json; exit;
}
if ($age < FRESH_FOR + STALE_FOR) {   // feeds failed: an older edition beats an empty page
  header('Cache-Control: no-store');
  readfile(CACHE_FILE); exit;
}
http_response_code(503);
header('Cache-Control: no-store');
echo json_encode($data);
