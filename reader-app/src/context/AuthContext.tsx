"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();

    const loadProfile = async (currentUser: User | null) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", currentUser.id).maybeSingle();
      setProfile(data as Profile | null);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user ?? null));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      loadProfile(session?.user ?? null);
    });

    return () => subscription.subscription.unsubscribe();
  }, [configured]);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      user,
      profile,
      signOut: async () => {
        if (!configured) return;
        await createClient().auth.signOut();
      },
    }),
    [configured, loading, user, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
