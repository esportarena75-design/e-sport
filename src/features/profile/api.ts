import { avatarPath, AVATAR_MAX_BYTES, isAllowedAvatarType } from "@/features/profile/avatar";
import { supabase } from "@/lib/supabase";

export async function updateProfile(userId: string, input: { username: string; bio: string }) {
  const { error } = await supabase
    .from("profiles")
    .update({ username: input.username, bio: input.bio.trim() === "" ? null : input.bio.trim() })
    .eq("id", userId);
  if (error) throw error;
}

export async function uploadAvatar(params: { userId: string; fileUri: string; mimeType: string }) {
  if (!isAllowedAvatarType(params.mimeType)) {
    throw new Error("AVATAR_TYPE");
  }
  const response = await fetch(params.fileUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > AVATAR_MAX_BYTES) {
    throw new Error("AVATAR_TOO_LARGE");
  }

  const path = avatarPath(params.userId, params.mimeType);
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, arrayBuffer, { contentType: params.mimeType });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", params.userId);
  if (error) throw error;

  await removeOldAvatars(params.userId, path);
}

export async function removeAvatar(userId: string) {
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw error;
  await removeOldAvatars(userId, null);
}

// Ménage : on ne garde qu'une photo par joueur. Un échec ici n'est pas bloquant.
async function removeOldAvatars(userId: string, keepPath: string | null) {
  try {
    const { data } = await supabase.storage.from("avatars").list(userId);
    const stale = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keepPath);
    if (stale.length > 0) await supabase.storage.from("avatars").remove(stale);
  } catch {
    // ignoré
  }
}
