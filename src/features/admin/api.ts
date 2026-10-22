import { supabase } from "@/lib/supabase";
import type { Dispute, Sanction, Tournament, TournamentPublic } from "@/types/database";

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

export async function cancelTournament(input: { tournamentId: string; reason?: string }) {
  const { error } = await supabase.rpc("cancel_tournament", {
    p_tournament_id: input.tournamentId,
    p_reason: input.reason ?? null,
  });
  if (error) throw error;
}

export async function forfeitMatch(input: { matchId: string; absentPlayerId: string; reason: string }) {
  const { error } = await supabase.rpc("admin_forfeit_match", {
    p_match_id: input.matchId,
    p_absent_player_id: input.absentPlayerId,
    p_reason: input.reason,
  });
  if (error) throw error;
}

export async function disqualifyParticipant(input: {
  tournamentId: string;
  userId: string;
  reason: string;
}) {
  const { error } = await supabase.rpc("disqualify_participant", {
    p_tournament_id: input.tournamentId,
    p_user_id: input.userId,
    p_reason: input.reason,
  });
  if (error) throw error;
}

export type SanctionType = "WARNING" | "SUSPENSION" | "BAN";

export async function applySanction(input: {
  userId: string;
  type: SanctionType;
  reason: string;
  endDate?: Date | null;
}) {
  const { error } = await supabase.rpc("apply_sanction", {
    p_user_id: input.userId,
    p_type: input.type,
    p_reason: input.reason,
    p_end_date: input.endDate ? input.endDate.toISOString() : null,
  });
  if (error) throw error;
}

export async function scheduleMatch(input: { matchId: string; scheduledAt: Date }) {
  const { error } = await supabase.rpc("admin_schedule_match", {
    p_match_id: input.matchId,
    p_scheduled_at: input.scheduledAt.toISOString(),
  });
  if (error) throw error;
}

export type AdminUser = {
  id: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
};

export async function searchUsers(query: string): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_search_users", { p_query: query });
  if (error) throw error;
  return (data ?? []) as AdminUser[];
}

export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const { data, error } = await supabase.rpc("admin_get_user", { p_user_id: userId });
  if (error) throw error;
  return ((data ?? []) as AdminUser[])[0] ?? null;
}

export async function listUserSanctions(userId: string): Promise<Sanction[]> {
  const { data, error } = await supabase
    .from("sanctions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function liftSanction(input: { userId: string; reason: string }) {
  const { error } = await supabase.rpc("admin_lift_sanction", {
    p_user_id: input.userId,
    p_reason: input.reason,
  });
  if (error) throw error;
}

export type AdminLog = {
  id: string;
  created_at: string;
  admin_username: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
};

export async function listAdminLogs(limit = 50): Promise<AdminLog[]> {
  const { data, error } = await supabase.rpc("admin_list_logs", { p_limit: limit });
  if (error) throw error;
  return (data ?? []) as AdminLog[];
}

export async function updateTournament(input: {
  tournamentId: string;
  name: string;
  description: string;
  rules: string;
  maxPlayers: number;
  registrationEnd: Date;
  startDate: Date;
}) {
  const { error } = await supabase.rpc("admin_update_tournament", {
    p_tournament_id: input.tournamentId,
    p_name: input.name,
    p_description: input.description,
    p_rules: input.rules,
    p_max_players: input.maxPlayers,
    p_registration_end: input.registrationEnd.toISOString(),
    p_start_date: input.startDate.toISOString(),
  });
  if (error) throw error;
}

export type AdminNews = {
  id: string;
  title: string;
  source_name: string;
  tag: string | null;
  published_at: string;
  is_published: boolean;
  is_auto: boolean;
};

export async function listAllNews(): Promise<AdminNews[]> {
  const { data, error } = await supabase
    .from("news")
    .select("id, title, source_name, tag, published_at, is_published, is_auto")
    .order("published_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data;
}

export async function createNews(input: {
  title: string;
  summary: string;
  tag?: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl?: string;
  createdBy: string;
}) {
  const { error } = await supabase.from("news").insert({
    title: input.title,
    summary: input.summary,
    tag: input.tag || null,
    source_name: input.sourceName,
    source_url: input.sourceUrl,
    image_url: input.imageUrl || null,
    is_published: true,
    created_by: input.createdBy,
  });
  if (error) throw error;
}

export async function setNewsPublished(input: { id: string; published: boolean }) {
  const { error } = await supabase.from("news").update({ is_published: input.published }).eq("id", input.id);
  if (error) throw error;
}

export async function deleteNews(id: string) {
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) throw error;
}
