"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ProfileStatus } from "@/lib/types";

const STATUS_LABEL: Record<ProfileStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

export function AdminPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError("No se pudo cargar la lista de usuarios.");
    } else {
      setProfiles((data ?? []) as Profile[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (fetchError) setError("No se pudo cargar la lista de usuarios.");
      else setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = async (id: string, status: ProfileStatus) => {
    setUpdatingId(id);
    const supabase = createClient();
    const { error: updateError } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (updateError) setError("No se pudo actualizar ese usuario.");
    await refresh();
    setUpdatingId(null);
  };

  const pending = profiles.filter((p) => p.status === "pending");
  const others = profiles.filter((p) => p.status !== "pending");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold">Administrar usuarios</h1>
        <p className="text-sm text-[var(--foreground)]/60">
          Aprobá o rechazá quién puede entrar a la app y usar el quiz.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--foreground)]/60">Cargando…</p>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]/70">
              Pendientes de aprobación ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-[var(--foreground)]/50">No hay solicitudes pendientes.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {pending.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  >
                    <span className="truncate text-sm">{p.email}</span>
                    <div className="flex shrink-0 gap-2">
                      <button
                        disabled={updatingId === p.id}
                        onClick={() => updateStatus(p.id, "approved")}
                        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        disabled={updatingId === p.id}
                        onClick={() => updateStatus(p.id, "rejected")}
                        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-[var(--foreground)]/70">Todos los usuarios</h2>
            <ul className="flex flex-col gap-2">
              {others.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                >
                  <span className="truncate text-sm">
                    {p.email} {p.is_admin && <span className="text-xs text-[var(--accent)]">(admin)</span>}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-[var(--foreground)]/60">{STATUS_LABEL[p.status]}</span>
                    {p.status === "approved" ? (
                      <button
                        disabled={updatingId === p.id}
                        onClick={() => updateStatus(p.id, "rejected")}
                        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
                      >
                        Revocar acceso
                      </button>
                    ) : (
                      <button
                        disabled={updatingId === p.id}
                        onClick={() => updateStatus(p.id, "approved")}
                        className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-foreground)] disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
