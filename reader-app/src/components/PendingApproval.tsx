"use client";

import { createClient } from "@/lib/supabase/client";
import type { ProfileStatus } from "@/lib/types";

export function PendingApproval({ status, email }: { status: ProfileStatus; email: string }) {
  const message =
    status === "rejected"
      ? "Tu solicitud de acceso fue rechazada. Si creés que es un error, contactá a quien administra la app."
      : "Tu cuenta todavía no fue aprobada. En cuanto un administrador la revise vas a poder entrar.";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-bold">{status === "rejected" ? "Acceso no autorizado" : "Cuenta pendiente de aprobación"}</h1>
      <p className="text-sm text-[var(--foreground)]/70">{message}</p>
      <p className="text-xs text-[var(--foreground)]/50">{email}</p>
      <button
        onClick={() => createClient().auth.signOut()}
        className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
