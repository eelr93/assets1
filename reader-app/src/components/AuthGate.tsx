"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { AuthForm } from "@/components/AuthForm";
import { PendingApproval } from "@/components/PendingApproval";

// Escape hatch for demoing/debugging without going through login. Set
// NEXT_PUBLIC_DISABLE_AUTH=true in the deployment's env vars to enable, and
// remove it (or set to anything else) to restore the normal login gate.
const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

/**
 * Decide si hace falta iniciar sesión para usar la app.
 *
 * Hay dos motivos distintos para no pedir cuenta, y conviene no confundirlos:
 *
 * 1. `NEXT_PUBLIC_DISABLE_AUTH=true` — salida explícita para mostrar o depurar
 *    la app **aunque Supabase esté configurado**. Se enciende a propósito y se
 *    apaga sacando la variable.
 *
 * 2. **Supabase no está configurado** — entonces no hay puerta que abrir. Eso
 *    no es una degradación: es el modo en que la app existe primero, un lector
 *    que funciona entero en el teléfono, sin cuentas y sin nada que pagar. Los
 *    libros viven en IndexedDB y nunca salen del dispositivo, así que no hay a
 *    quién autenticar.
 *
 * Las cuentas existen para una sola cosa: controlar quién puede generar quizzes
 * con IA, que consume tokens pagos. Cuando se cargan las variables de Supabase,
 * la puerta aparece sola y la app pasa a ser el producto completo. No hay dos
 * versiones del código ni una rama que mantener: es la misma app leyendo su
 * entorno.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { configured, loading, user, profile } = useAuth();

  if (authDisabled) return <>{children}</>;

  if (!configured) return <>{children}</>;

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
