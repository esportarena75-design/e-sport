import { supabase } from "@/lib/supabase";
import type { MatchPublic } from "@/types/database";

export async function listMatches(tournamentId: string): Promise<MatchPublic[]> {
  const { data, error } = await supabase
    .from("matches_public")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });
  if (error) throw error;
  return data;
}

export async function generateBracket(tournamentId: string) {
  const { error } = await supabase.rpc("generate_bracket", { p_tournament_id: tournamentId });
  if (error) throw error;
}
