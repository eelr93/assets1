"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSignupDone(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err instanceof Error ? translateAuthError(err.message) : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  if (signupDone) {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold">Revisá tu correo</h1>
        <p className="text-sm text-[var(--foreground)]/70">
          Te enviamos un enlace de confirmación a <strong>{email}</strong>. Una vez que confirmes tu
          cuenta, un administrador tiene que aprobarla antes de que puedas entrar.
        </p>
        <button
          onClick={() => {
            setSignupDone(false);
            setMode("login");
          }}
          className="mt-2 text-sm font-medium text-[var(--accent)] underline"
        >
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold">Lectura Accesible</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/60">
          {mode === "login" ? "Iniciá sesión para continuar." : "Creá tu cuenta para solicitar acceso."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base focus:outline focus:outline-2 focus:outline-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base focus:outline focus:outline-2 focus:outline-[var(--accent)]"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Un momento…" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </button>
      </form>

      <button
        onClick={() => {
          setError(null);
          setMode(mode === "login" ? "signup" : "login");
        }}
        className="text-sm text-[var(--accent)] underline"
      >
        {mode === "login" ? "¿No tenés cuenta? Registrate" : "¿Ya tenés cuenta? Iniciá sesión"}
      </button>
    </div>
  );
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "Correo o contraseña incorrectos.";
  if (/user already registered/i.test(message)) return "Ese correo ya está registrado.";
  if (/password should be at least/i.test(message)) return "La contraseña debe tener al menos 6 caracteres.";
  if (/failed to fetch|network/i.test(message)) {
    return "No se pudo conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo.";
  }
  return message;
}
