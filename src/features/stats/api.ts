import { supabase } from "@/lib/supabase";
import type { PlayerStats, PublicProfile, RankingEntry } from "@/types/database";

export async function getPlayerStats(userId: string): Promise<PlayerStats | null> {
  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listRankings(): Promise<RankingEntry[]> {
  const { data, error } = await supabase
    .from("rankings")
    .select("*")
    .order("score", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPublicProfile(id: string): Promise<PublicProfile> {
  const { data, error } = await supabase.from("public_profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
