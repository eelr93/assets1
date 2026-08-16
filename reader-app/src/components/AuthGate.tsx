"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthForm } from "@/components/AuthForm";
import { PendingApproval } from "@/components/PendingApproval";

export function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, user, profile } = useAuth();

  if (!configured) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold">Falta configurar el acceso</h1>
        <p className="text-sm text-[var(--foreground)]/70">
          Esta instancia todavía no tiene Supabase configurado (NEXT_PUBLIC_SUPABASE_URL /
          NEXT_PUBLIC_SUPABASE_ANON_KEY). Revisá SETUP.md para dejarla lista.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[var(--foreground)]/60">Cargando…</p>
      </div>
    );
  }

  if (!user) return <AuthForm />;

  if (!profile || profile.status !== "approved") {
    return <PendingApproval status={profile?.status ?? "pending"} email={user.email ?? ""} />;
  }

  return <>{children}</>;
}
