export type ReptileStory = {
  title: string;
  url: string;
  publishedAt: string;
  publisher: string;
  summary?: string;
  imageUrl?: string;
};

type FeedSource = { url: string; publisher: string; hosts: string[] };
const FEEDS: FeedSource[] = [
  { url: "https://www.sciencedaily.com/rss/plants_animals/frogs_and_reptiles.xml", publisher: "Science Daily", hosts: ["www.sciencedaily.com", "sciencedaily.com"] },
  { url: "https://reptilesmagazine.com/feed/", publisher: "REPTILES Magazine", hosts: ["reptilesmagazine.com", "www.reptilesmagazine.com"] },
  { url: "https://phys.org/rss-feed/biology-news/plants-animals/", publisher: "Phys.org", hosts: ["phys.org", "www.phys.org"] },
  { url: "https://news.mongabay.com/feed/?post_type=post&feedtype=bulletpoints&topic=reptiles", publisher: "Mongabay", hosts: ["news.mongabay.com"] },
  { url: "https://usark.org/feed/", publisher: "USARK", hosts: ["usark.org", "www.usark.org"] },
];
const REPTILE = /\b(reptile|snake|python|boa|viper|cobra|lizard|gecko|iguana|chameleon|skink|turtle|tortoise|crocodile|alligator|serpent|dinosaur|anole|monitor lizard|chondro|herpetolog)\w*\b/i;

function textFromXml(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const point = code.toLowerCase().startsWith("x") ? parseInt(code.slice(1), 16) : parseInt(code, 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    })
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
    .trim();
}

function field(item: string, name: string) {
  const match = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? textFromXml(match[1]) : "";
}

function compactSummary(value: string, max = 320) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  let summary = "";
  for (const sentence of sentences.slice(0, 3)) {
    const candidate = summary ? `${summary} ${sentence}` : sentence;
    if (candidate.length > max) break;
    summary = candidate;
    if (summary.split(/(?<=[.!?])\s+/).length >= 2) break;
  }
  if (summary) return summary;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 45)).trim()}…`;
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return textFromXml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function metaContent(html: string, keys: string[]) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attr(tag, "property") || attr(tag, "name")).toLowerCase();
    if (keys.includes(key)) {
      const content = attr(tag, "content");
      if (content) return content;
    }
  }
  return "";
}

function articleLead(html: string) {
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? html;
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => textFromXml(match[1]).replace(/\s+/g, " ").trim())
    .filter((text) => text.length >= 70 && !/cookie|newsletter|subscribe|advertis/i.test(text));
  return paragraphs.slice(0, 3).join(" ");
}

function safeImageUrl(value: string, baseUrl: string) {
  if (!value) return "";
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

async function enrichStory(story: ReptileStory): Promise<ReptileStory> {
  const source = FEEDS.find((item) => item.hosts.includes(new URL(story.url).hostname));
  if (!source) return story;
  try {
    let url = story.url;
    let response = await fetch(url, {
      next: { revalidate: 60 * 60 * 12 },
      signal: AbortSignal.timeout(6000),
      redirect: "manual",
      headers: { Accept: "text/html,application/xhtml+xml" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return story;
      const redirected = new URL(location, url);
      if (redirected.protocol !== "https:" || !source.hosts.includes(redirected.hostname)) return story;
      url = redirected.href;
      response = await fetch(url, {
        next: { revalidate: 60 * 60 * 12 },
        signal: AbortSignal.timeout(6000),
        redirect: "manual",
        headers: { Accept: "text/html,application/xhtml+xml" },
      });
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("text/html") ||
      Number(response.headers.get("content-length")) > 1_500_000) return story;
    const html = await response.text();
    if (html.length > 1_500_000) return story;

    const description = metaContent(html, ["description", "og:description", "twitter:description"]);
    const lead = articleLead(html);
    const summary = compactSummary(description.length >= 70 ? description : lead) || story.summary;
    const imageUrl = safeImageUrl(metaContent(html, ["og:image", "twitter:image", "twitter:image:src"]), url) || story.imageUrl;
    return { ...story, summary, imageUrl };
  } catch {
    return story;
  }
}

export function parseReptileFeed(xml: string, source: FeedSource = FEEDS[0], now = Date.now()): ReptileStory[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const title = field(item, "title");
    const url = field(item, "link");
    const publishedAt = field(item, "pubDate");
    const date = Date.parse(publishedAt);
    let parsed: URL;
    try { parsed = new URL(url); } catch { return []; }
    if (parsed.protocol !== "https:" || !source.hosts.includes(parsed.hostname) ||
      !REPTILE.test(title) || !title || !Number.isFinite(date) ||
      date > now + 86400000 || date < now - 120 * 86400000 || seen.has(parsed.href)) return [];
    seen.add(parsed.href);
    const summary = compactSummary(field(item, "description"));
    return [{ title, url: parsed.href, publishedAt: new Date(date).toISOString(), publisher: source.publisher, ...(summary ? { summary } : {}) }];
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 4);
}

export async function getReptileNews(): Promise<ReptileStory[]> {
  const results = await Promise.all(FEEDS.map(async (source) => {
    try {
      const response = await fetch(source.url, {
        next: { revalidate: 60 * 60 * 6 },
        signal: AbortSignal.timeout(7000),
        headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      });
      if (!response.ok || Number(response.headers.get("content-length")) > 1_000_000) return [];
      const xml = await response.text();
      if (xml.length > 1_000_000) return [];
      return parseReptileFeed(xml, source);
    } catch {
      return [];
    }
  }));
  const unique = new Map<string, ReptileStory>();
  for (const story of results.flat()) unique.set(story.url, story);
  const stories = [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 16);

  // The homepage only shows five cards. Enrich a few extras so one slow publisher
  // cannot leave the carousel empty, while avoiding a burst of article-page requests.
  const enriched = await Promise.all(stories.slice(0, 8).map(enrichStory));
  return [...enriched, ...stories.slice(8)];
}
