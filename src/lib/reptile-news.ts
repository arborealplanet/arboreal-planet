export type ReptileStory = {
  title: string;
  url: string;
  publishedAt: string;
  publisher: string;
};

const FEED = "https://www.sciencedaily.com/rss/plants_animals/frogs_and_reptiles.xml";
const REPTILE = /\b(reptile|snake|python|boa|viper|cobra|lizard|gecko|iguana|chameleon|skink|turtle|tortoise|crocodile|alligator|serpent|dinosaur)\w*\b/i;

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

export function parseReptileFeed(xml: string, now = Date.now()): ReptileStory[] {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];
  const seen = new Set<string>();
  return items.flatMap((item) => {
    const title = field(item, "title");
    const url = field(item, "link");
    const publishedAt = field(item, "pubDate");
    const date = Date.parse(publishedAt);
    let parsed: URL;
    try { parsed = new URL(url); } catch { return []; }
    if (parsed.protocol !== "https:" || parsed.hostname !== "www.sciencedaily.com" ||
      !REPTILE.test(title) || !title || !Number.isFinite(date) ||
      date > now + 86400000 || date < now - 120 * 86400000 || seen.has(parsed.href)) return [];
    seen.add(parsed.href);
    return [{ title, url: parsed.href, publishedAt: new Date(date).toISOString(), publisher: "Science Daily" }];
  }).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 10);
}

export async function getReptileNews(): Promise<ReptileStory[]> {
  try {
    const response = await fetch(FEED, {
      next: { revalidate: 60 * 60 * 6 },
      signal: AbortSignal.timeout(7000),
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!response.ok || Number(response.headers.get("content-length")) > 1_000_000) return [];
    const xml = await response.text();
    if (xml.length > 1_000_000) return [];
    return parseReptileFeed(xml);
  } catch {
    return [];
  }
}
