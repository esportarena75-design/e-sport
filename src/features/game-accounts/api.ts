import { supabase } from "@/lib/supabase";
import type { Game, GameAccountWithDetails, Platform } from "@/types/database";

export async function listGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("status", "ACTIVE")
    .order("name");
  if (error) throw error;
  return data;
}

export async function listPlatforms(): Promise<Platform[]> {
  const { data, error } = await supabase
    .from("platforms")
    .select("*")
    .eq("status", "ACTIVE")
    .order("name");
  if (error) throw error;
  return data;
}

export async function listGameAccounts(userId: string): Promise<GameAccountWithDetails[]> {
  const { data, error } = await supabase
    .from("game_accounts")
    .select("*, game:games(id, name, slug), platform:platforms(id, name, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as GameAccountWithDetails[];
}

export async function addGameAccount(input: {
  userId: string;
  gameId: string;
  platformId: string;
  playerIdentifier: string;
}) {
  const { error } = await supabase.from("game_accounts").insert({
    user_id: input.userId,
    game_id: input.gameId,
    platform_id: input.platformId,
    player_identifier: input.playerIdentifier,
  });
  if (error) throw error;
}

export async function deleteGameAccount(id: string) {
  const { error } = await supabase.from("game_accounts").delete().eq("id", id);
  if (error) throw error;
}
