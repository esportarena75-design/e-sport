// Lecteur RSS 2.0 minimal, sans dépendance, utilisé par l'Edge Function `sync-news`.
// Volontairement en TypeScript pur (aucune API Deno) pour pouvoir être testé avec Jest :
// voir src/utils/rss.test.ts.
//
// On ne reprend de chaque article que le titre, un court extrait, l'image d'illustration
// et le lien : jamais le texte complet. Chaque carte renvoie vers l'article d'origine.

export type FeedItem = {
  title: string;
  link: string;
  publishedAt: string | null; // ISO 8601
  description: string; // HTML brut tel que fourni par le flux
  imageUrl: string | null;
};

export type NewsRow = {
  title: string;
  summary: string;
  tag: string | null;
  source_name: string;
  source_url: string;
  image_url: string | null;
  published_at: string;
  is_published: true;
  is_auto: true;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function unwrapCdata(value: string): string {
  const trimmed = value.trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(trimmed);
  return cdata ? cdata[1] : trimmed;
}

function getTagText(block: string, tag: string): string | null {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i").exec(block);
  if (!match) return null;
  const raw = unwrapCdata(match[1]);
  // Contenu CDATA = HTML déjà "prêt à lire" ; sinon les entités XML doivent être décodées.
  return /^<!\[CDATA\[/.test(match[1].trim()) ? raw : decodeEntities(raw);
}

function getAttributes(tagSource: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const m of tagSource.matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attributes[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? "");
  }
  return attributes;
}

export function toHttps(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
  return null;
}

// Pastilles, emojis et pixels de suivi ne sont pas des illustrations d'article.
const UNWANTED_IMAGE = /(emoji|smilies|gravatar|pixel|spacer|\/avatar)|\.gif(\?|$)/i;

function extractImage(itemBlock: string, htmlParts: string[]): string | null {
  const candidates: string[] = [];

  for (const m of itemBlock.matchAll(/<enclosure\b[^>]*>/gi)) {
    const attrs = getAttributes(m[0]);
    if (attrs.url && (!attrs.type || attrs.type.startsWith("image/"))) candidates.push(attrs.url);
  }
  for (const m of itemBlock.matchAll(/<media:(?:content|thumbnail)\b[^>]*>/gi)) {
    const attrs = getAttributes(m[0]);
    if (attrs.url && (!attrs.medium || attrs.medium === "image")) candidates.push(attrs.url);
  }
  for (const html of htmlParts) {
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      const attrs = getAttributes(m[0]);
      if (attrs.src) candidates.push(attrs.src);
    }
  }

  for (const candidate of candidates) {
    const https = toHttps(candidate);
    if (https && !UNWANTED_IMAGE.test(https)) return https;
  }
  return null;
}

export function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];

  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const block = match[1];
    const title = getTagText(block, "title");
    const link = getTagText(block, "link");
    if (!title || !link) continue;

    const description = getTagText(block, "description") ?? "";
    const content = getTagText(block, "content:encoded") ?? "";
    const pubDate = getTagText(block, "pubDate") ?? getTagText(block, "dc:date");
    const parsedDate = pubDate ? new Date(pubDate) : null;

    items.push({
      title: stripHtml(title),
      link: link.trim(),
      publishedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null,
      description,
      imageUrl: extractImage(block, [description, content]),
    });
  }

  return items;
}

export function stripHtml(html: string): string {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|br|div|li|h[1-6])\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return (
    decodeEntities(text)
      // Pied de page ajouté par WordPress : « The post X appeared first on Y. »
      .replace(/(The post .* appeared first on .*|Cet article .* est apparu en premier sur .*)$/is, "")
      .replace(/\[\s*(…|\.\.\.)\s*\]/g, "…")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s,;:.…-]+$/, "")}…`;
}

const TAG_RULES: Array<[RegExp, string]> = [
  [/valorant|\bVCT\b/i, "Valorant"],
  [/league of legends|\bLoL\b|\bLEC\b|\bLFL\b|\bworlds\b|\bMSI\b/i, "LoL"],
  [/counter-strike|\bCS2\b|\bCSGO\b/i, "CS2"],
  [/rocket league|\bRLCS\b/i, "Rocket League"],
  [/\bFC ?2\d\b|EA Sports FC|\bFIFA\b/i, "EA FC"],
  [/fortnite/i, "Fortnite"],
  [/overwatch/i, "Overwatch"],
  [/street fighter|tekken|jeux? de combat/i, "Jeux de combat"],
  [/rainbow six|\bR6\b/i, "Rainbow Six"],
  [/trackmania/i, "Trackmania"],
  [/esports world cup|\bEWC\b/i, "EWC"],
];

export function detectTag(text: string): string | null {
  for (const [pattern, label] of TAG_RULES) {
    if (pattern.test(text)) return label;
  }
  return null;
}

// Convertit un article en ligne de la table `news` en respectant ses contraintes SQL
// (titre 3–120, résumé 3–280, tag ≤ 24, liens https). Renvoie null si l'article est inutilisable.
export function toNewsRow(item: FeedItem, sourceName: string, now: Date = new Date()): NewsRow | null {
  const link = toHttps(item.link);
  const title = truncate(item.title, 120);
  if (!link || title.length < 3) return null;

  const excerpt = stripHtml(item.description);
  const summary = truncate(excerpt.length >= 3 ? excerpt : title, 280);

  const published = item.publishedAt ? new Date(item.publishedAt) : now;
  // Une date dans le futur (horloge du flux décalée) ferait remonter l'article en tête indéfiniment.
  const publishedAt = published.getTime() > now.getTime() ? now : published;

  return {
    title,
    summary,
    tag: detectTag(`${item.title} ${excerpt}`),
    source_name: sourceName,
    source_url: link,
    image_url: item.imageUrl,
    published_at: publishedAt.toISOString(),
    is_published: true,
    is_auto: true,
  };
}
