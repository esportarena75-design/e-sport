import { supabase } from "@/lib/supabase";
import type { Dispute, Tournament, TournamentPublic } from "@/types/database";

export async function listAllTournamentsForAdmin(): Promise<TournamentPublic[]> {
  const { data, error } = await supabase
    .from("tournaments_public")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTournament(input: {
  name: string;
  description?: string;
  gameId: string;
  platformId: string;
  maxPlayers: number;
  registrationStart: string;
  registrationEnd: string;
  startDate: string;
  rules?: string;
  createdBy: string;
}): Promise<Tournament> {
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name: input.name,
      description: input.description ?? null,
      game_id: input.gameId,
      platform_id: input.platformId,
      max_players: input.maxPlayers,
      registration_start: input.registrationStart,
      registration_end: input.registrationEnd,
      start_date: input.startDate,
      rules: input.rules ?? null,
      status: "REGISTRATION_OPEN",
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTournamentStatus(id: string, status: string) {
  const { error } = await supabase.from("tournaments").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function listOpenDisputes(): Promise<Dispute[]> {
  const { data, error } = await supabase
    .from("disputes")
    .select("*")
    .in("status", ["OPEN", "UNDER_REVIEW"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function resolveDispute(input: {
  disputeId: string;
  decision: string;
  winnerId?: string;
  newStatus: "RESOLVED" | "DISMISSED";
}) {
  const { error } = await supabase.rpc("resolve_dispute", {
    p_dispute_id: input.disputeId,
    p_decision: input.decision,
    p_winner_id: input.winnerId ?? null,
    p_new_status: input.newStatus,
  });
  if (error) throw error;
}
