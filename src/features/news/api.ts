import { supabase } from "@/lib/supabase";
import type { NewsItem } from "@/types/database";

export const HOME_NEWS_LIMIT = 6;

export async function listLatestNews(limit: number = HOME_NEWS_LIMIT): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from("news")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
