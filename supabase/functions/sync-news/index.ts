// Edge Function `sync-news` : lit les flux RSS de médias e-sport FR et alimente la table `news`.
// Appelée toutes les 30 min par pg_cron (voir README.md). Ne reprend que titre, extrait court,
// image d'illustration et lien : chaque carte renvoie vers l'article d'origine.
import { createClient } from "jsr:@supabase/supabase-js@2";

import { parseFeed, toNewsRow, type NewsRow } from "../_shared/rss.ts";

type Feed = {
  name: string;
  url: string;
  // Flux généraliste : on ne garde que les articles qui parlent d'e-sport.
  keywords?: RegExp;
};

const FEEDS: Feed[] = [
  { name: "Actu-Lan", url: "https://www.actu-lan.com/feed/" },
  {
    name: "Dexerto",
    url: "https://www.dexerto.fr/feed/",
    keywords:
      /esport|e-sport|valorant|league of legends|\bLoL\b|counter-strike|\bCS2\b|rocket league|karmine|vitality|\bEWC\b|\bworlds\b|\bLEC\b|\bLFL\b|\bVCT\b|rainbow six|overwatch|tournoi/i,
  },
];

const MAX_PER_FEED = 10;
const KEEP_DAYS = 45;

async function fetchFeed(feed: Feed): Promise<NewsRow[]> {
  const response = await fetch(feed.url, {
    headers: { "user-agent": "ProjectArenaNewsBot/1.0", accept: "application/rss+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${feed.name}: HTTP ${response.status}`);

  const items = parseFeed(await response.text());
  const rows: NewsRow[] = [];
  for (const item of items) {
    if (feed.keywords && !feed.keywords.test(`${item.title} ${item.description}`)) continue;
    const row = toNewsRow(item, feed.name);
    if (row) rows.push(row);
    if (rows.length >= MAX_PER_FEED) break;
  }
  return rows;
}

Deno.serve(async (req) => {
  // Même principe que send-push : seul le planificateur (qui connaît le secret) peut déclencher.
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const report: Record<string, string> = {};
  const rows: NewsRow[] = [];

  results.forEach((result, index) => {
    const name = FEEDS[index].name;
    if (result.status === "fulfilled") {
      rows.push(...result.value);
      report[name] = `${result.value.length} article(s) lus`;
    } else {
      // Un flux en panne ne doit pas bloquer les autres.
      report[name] = `erreur : ${String(result.reason)}`;
      console.error(name, result.reason);
    }
  });

  let inserted = 0;
  if (rows.length > 0) {
    // ignoreDuplicates : un article déjà en base (ou retouché par un admin) n'est jamais écrasé.
    const { data, error } = await supabase
      .from("news")
      .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
      .select("id");
    if (error) {
      console.error("upsert news", error);
      return Response.json({ ok: false, error: error.message, report }, { status: 500 });
    }
    inserted = data?.length ?? 0;
  }

  // Ménage : on ne garde que les actus automatiques récentes (les actus saisies à la main restent).
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString();
  const { error: cleanError } = await supabase
    .from("news")
    .delete()
    .eq("is_auto", true)
    .lt("published_at", cutoff);
  if (cleanError) console.error("cleanup news", cleanError);

  return Response.json({ ok: true, inserted, report });
});
