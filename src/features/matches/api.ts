import { supabase } from "@/lib/supabase";
import type { DisputeReason, MatchPublic, MatchReport } from "@/types/database";

export async function getMatch(id: string): Promise<MatchPublic> {
  const { data, error } = await supabase.from("matches_public").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function listMatchReports(matchId: string): Promise<MatchReport[]> {
  const { data, error } = await supabase
    .from("match_reports")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listMyMatches(userId: string): Promise<MatchPublic[]> {
  const { data, error } = await supabase
    .from("matches_public")
    .select("*")
    .or(`player_1_id.eq.${userId},player_2_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function reportMatchResult(input: {
  matchId: string;
  myScore: number;
  opponentScore: number;
  comment?: string;
  evidencePath?: string;
}) {
  const { error } = await supabase.rpc("report_match_result", {
    p_match_id: input.matchId,
    p_my_score: input.myScore,
    p_opponent_score: input.opponentScore,
    p_comment: input.comment ?? null,
    p_evidence_path: input.evidencePath ?? null,
  });
  if (error) throw error;
}

export async function confirmMatchResult(matchId: string) {
  const { error } = await supabase.rpc("confirm_match_result", { p_match_id: matchId });
  if (error) throw error;
}

export async function openDispute(input: {
  matchId: string;
  reason: DisputeReason;
  description?: string;
  evidencePath?: string;
}) {
  const { error } = await supabase.rpc("open_dispute", {
    p_match_id: input.matchId,
    p_reason: input.reason,
    p_description: input.description ?? null,
    p_evidence_path: input.evidencePath ?? null,
  });
  if (error) throw error;
}

export async function uploadMatchEvidence(params: {
  tournamentId: string;
  matchId: string;
  userId: string;
  fileUri: string;
  contentType: string;
}): Promise<string> {
  const ext = params.contentType.split("/")[1] ?? "jpg";
  const path = `${params.tournamentId}/${params.matchId}/${params.userId}/evidence.${ext}`;
  const response = await fetch(params.fileUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from("match-evidence")
    .upload(path, arrayBuffer, { contentType: params.contentType, upsert: true });
  if (error) throw error;

  return path;
}

export async function getMatchEvidenceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("match-evidence")
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
