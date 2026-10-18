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

export async function deleteOwnAccount(userId: string) {
  const { error } = await supabase.from("profiles").update({ status: "DELETED" }).eq("id", userId);
  if (error) throw error;
  await signOut();
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}
