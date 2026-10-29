import { supabase } from "@/lib/supabase";

export type Announcement = {
  id: string;
  tournament_id: string | null;
  title: string;
  body: string;
  created_at: string;
};

export async function listTournamentAnnouncements(tournamentId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data;
}

export async function listRecentAnnouncements(limit = 30): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function sendAnnouncement(input: {
  tournamentId: string | null;
  title: string;
  body: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc("admin_send_announcement", {
    p_tournament_id: input.tournamentId,
    p_title: input.title,
    p_body: input.body,
  });
  if (error) throw error;
  return data as string;
}
