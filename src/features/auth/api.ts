import { supabase } from "@/lib/supabase";
import type { LoginInput, RegisterInput } from "@/schemas/auth";
import type { Profile } from "@/types/database";

export async function signUp(input: RegisterInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username,
        country: "FR",
        birth_date: input.birthDate.toISOString().slice(0, 10),
        terms_accepted: true,
        privacy_accepted: true,
        rules_accepted: true,
      },
    },
  });
  if (error) throw error;

  return { emailConfirmationRequired: data.session === null };
}

export async function signIn(input: LoginInput) {
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// Suppression réelle : photos supprimées, profil anonymisé, e-mail effacé et compte bloqué côté base
// (fonction SQL delete_own_account). La session locale est fermée sans appel serveur : ses jetons
// viennent d'être révoqués.
export async function deleteOwnAccount(userId: string) {
  try {
    const { data } = await supabase.storage.from("avatars").list(userId);
    const files = (data ?? []).map((file) => `${userId}/${file.name}`);
    if (files.length > 0) await supabase.storage.from("avatars").remove(files);
  } catch {
    // Les photos orphelines ne doivent pas empêcher la suppression du compte.
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
  await supabase.auth.signOut({ scope: "local" });
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}
