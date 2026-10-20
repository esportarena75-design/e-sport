import { decodeEntities, detectTag, parseFeed, stripHtml, toNewsRow, truncate } from "../../supabase/functions/_shared/rss";

const SAMPLE = `<?xml version="1.0"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<item>
  <title><![CDATA[Valorant Champions : LOUD sacré champion]]></title>
  <link>http://example.com/loud</link>
  <pubDate>Sun, 18 Oct 2026 10:00:00 +0000</pubDate>
  <description><![CDATA[<p><img src="http://example.com/img.jpg" /> LOUD bat Vitality &#8217; en finale. […]</p><p>The post LOUD appeared first on Actu-Lan.</p>]]></description>
</item>
<item>
  <title>Rocket League &amp; co</title>
  <link>https://example.com/rl</link>
  <media:thumbnail url="https://example.com/thumb.png" />
  <description>Court</description>
</item>
<item><title>Sans lien</title></item>
</channel></rss>`;

describe("rss", () => {
  it("décode les entités", () => {
    expect(decodeEntities("a &amp; b &#8217; &#x41;")).toBe("a & b ’ A");
  });

  it("nettoie le HTML et le pied WordPress", () => {
    expect(stripHtml("<p>Salut <b>toi</b> […]</p><p>The post X appeared first on Y.</p>")).toBe("Salut toi …");
  });

  it("tronque proprement", () => {
    expect(truncate("un deux trois quatre cinq six sept", 15).length).toBeLessThanOrEqual(15);
    expect(truncate("court", 15)).toBe("court");
  });

  it("détecte le jeu", () => {
    expect(detectTag("Finale de Valorant Champions")).toBe("Valorant");
    expect(detectTag("rien")).toBeNull();
  });

  it("parse les articles, force https et ignore ceux sans lien", () => {
    const items = parseFeed(SAMPLE);
    expect(items).toHaveLength(2);
    expect(items[0].imageUrl).toBe("https://example.com/img.jpg");
    expect(items[0].publishedAt).toBe("2026-10-18T10:00:00.000Z");
    expect(items[1].title).toBe("Rocket League & co");
    expect(items[1].imageUrl).toBe("https://example.com/thumb.png");
  });

  it("produit des lignes conformes aux contraintes SQL", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    const row = toNewsRow(parseFeed(SAMPLE)[0], "Actu-Lan", now)!;
    expect(row.source_url).toBe("https://example.com/loud");
    expect(row.tag).toBe("Valorant");
    expect(row.title.length).toBeLessThanOrEqual(120);
    expect(row.summary.length).toBeLessThanOrEqual(280);
    expect(row.is_auto).toBe(true);
  });

  it("plafonne une date future", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    const item = { ...parseFeed(SAMPLE)[0], publishedAt: "2027-01-01T00:00:00.000Z" };
    expect(toNewsRow(item, "X", now)!.published_at).toBe(now.toISOString());
  });
});
