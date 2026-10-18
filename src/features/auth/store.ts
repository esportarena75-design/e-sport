import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthState = {
  status: AuthStatus;
  session: Session | null;
};

export const useAuthStore = create<AuthState>(() => ({
  status: "loading",
  session: null,
}));

let listenerInitialized = false;

export function initAuthListener() {
  if (listenerInitialized) return;
  listenerInitialized = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.setState({ session, status: session ? "authenticated" : "unauthenticated" });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, status: session ? "authenticated" : "unauthenticated" });
  });
}
