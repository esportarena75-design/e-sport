import { supabase } from "@/lib/supabase";
import type { TournamentParticipantPublic, TournamentPublic, TournamentStatus } from "@/types/database";

export const TOURNAMENTS_PAGE_SIZE = 10;

export type TournamentFilters = {
  search?: string;
  gameId?: string;
  platformId?: string;
  status?: TournamentStatus;
};

export async function listTournaments(
  filters: TournamentFilters,
  page: number,
): Promise<TournamentPublic[]> {
  let query = supabase.from("tournaments_public").select("*").order("start_date", { ascending: true });

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }
  if (filters.gameId) {
    query = query.eq("game_id", filters.gameId);
  }
  if (filters.platformId) {
    query = query.eq("platform_id", filters.platformId);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const from = page * TOURNAMENTS_PAGE_SIZE;
  const to = from + TOURNAMENTS_PAGE_SIZE - 1;
  const { data, error } = await query.range(from, to);
  if (error) throw error;
  return data;
}

export async function getTournament(id: string): Promise<TournamentPublic> {
  const { data, error } = await supabase.from("tournaments_public").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function listParticipants(
  tournamentId: string,
): Promise<TournamentParticipantPublic[]> {
  const { data, error } = await supabase
    .from("tournament_participants_public")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("registered_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listMyTournaments(userId: string): Promise<TournamentPublic[]> {
  const { data: participations, error: participationsError } = await supabase
    .from("tournament_participants_public")
    .select("tournament_id")
    .eq("user_id", userId);
  if (participationsError) throw participationsError;

  const tournamentIds = participations.map((p) => p.tournament_id);
  if (tournamentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("tournaments_public")
    .select("*")
    .in("id", tournamentIds)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return data;
}

export async function joinTournament(tournamentId: string) {
  const { data, error } = await supabase.rpc("join_tournament", { p_tournament_id: tournamentId });
  if (error) throw error;
  return data;
}

export async function leaveTournament(tournamentId: string, userId: string) {
  // A DELETE blocked by RLS doesn't error -- it just matches 0 rows. Request the
  // deleted rows back so a silently-blocked unregistration surfaces as an error
  // instead of doing nothing.
  const { data, error } = await supabase
    .from("tournament_participants")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Unregistration was blocked (registration may already be closed)");
  }
}
