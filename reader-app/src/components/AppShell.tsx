"use client";

import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Library } from "@/components/Library";
import { Reader } from "@/components/Reader";
import { AdminPanel } from "@/components/AdminPanel";
import { useAuth } from "@/context/AuthContext";

export function AppShell() {
  const [openBookId, setOpenBookId] = useState<string | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <AuthGate>
      <Shell
        openBookId={openBookId}
        setOpenBookId={setOpenBookId}
        showAdmin={showAdmin}
        setShowAdmin={setShowAdmin}
      />
    </AuthGate>
  );
}

function Shell({
  openBookId,
  setOpenBookId,
  showAdmin,
  setShowAdmin,
}: {
  openBookId: string | null;
  setOpenBookId: (id: string | null) => void;
  showAdmin: boolean;
  setShowAdmin: (v: boolean) => void;
}) {
  const { profile, signOut } = useAuth();

  if (openBookId) {
    return <Reader bookId={openBookId} onBack={() => setOpenBookId(null)} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-end gap-3 border-b border-[var(--border)] px-4 py-2 text-sm">
        <span className="truncate text-[var(--foreground)]/60">{profile?.email}</span>
        {profile?.is_admin && (
          <button
            onClick={() => setShowAdmin(!showAdmin)}
            className="rounded-md border border-[var(--border)] px-2.5 py-1 font-medium"
          >
            {showAdmin ? "Biblioteca" : "Administrar usuarios"}
          </button>
        )}
        <button onClick={() => signOut()} className="rounded-md border border-[var(--border)] px-2.5 py-1 font-medium">
          Cerrar sesión
        </button>
      </div>

      {showAdmin ? <AdminPanel /> : <Library onOpenBook={setOpenBookId} />}
    </div>
  );
}
