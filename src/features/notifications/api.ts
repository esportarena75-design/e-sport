import { supabase } from "@/lib/supabase";
import type { NotificationRow } from "@/types/database";

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function registerDevice(input: {
  userId: string;
  expoPushToken: string;
  platform: "ios" | "android";
}) {
  const { error } = await supabase.from("devices").upsert(
    {
      user_id: input.userId,
      expo_push_token: input.expoPushToken,
      platform: input.platform,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "expo_push_token" },
  );
  if (error) throw error;
}

export async function isTournamentMuted(userId: string, tournamentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("notification_mutes")
    .select("tournament_id")
    .eq("user_id", userId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function setTournamentMuted(input: { userId: string; tournamentId: string; muted: boolean }) {
  if (input.muted) {
    const { error } = await supabase
      .from("notification_mutes")
      .upsert(
        { user_id: input.userId, tournament_id: input.tournamentId },
        { ignoreDuplicates: true },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("notification_mutes")
      .delete()
      .eq("user_id", input.userId)
      .eq("tournament_id", input.tournamentId);
    if (error) throw error;
  }
}
