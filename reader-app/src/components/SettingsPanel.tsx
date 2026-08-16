"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/context/SettingsContext";
import type { FontId, ThemeId } from "@/lib/types";

const THEMES: { id: ThemeId; label: string; bg: string; fg: string }[] = [
  { id: "light", label: "Claro", bg: "#fdfdfb", fg: "#1a1a1a" },
  { id: "sepia", label: "Sepia", bg: "#f4ecd8", fg: "#3a3226" },
  { id: "dark", label: "Oscuro", bg: "#1e1f22", fg: "#e7e7e5" },
  { id: "night", label: "Nocturno", bg: "#000000", fg: "#c9c9c9" },
  { id: "contrast", label: "Alto contraste", bg: "#000000", fg: "#ffff00" },
];

const FONTS: { id: FontId; label: string; sample: string; family: string }[] = [
  { id: "accessible", label: "Accesible", sample: "Aa", family: "var(--font-accessible)" },
  { id: "reading-serif", label: "Lectura (serif)", sample: "Aa", family: "var(--font-reading-serif)" },
  { id: "system", label: "Sistema", sample: "Aa", family: "var(--font-system)" },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, update, reset } = useSettings();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes de lectura"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col gap-6 overflow-y-auto bg-[var(--surface)] p-5 text-[var(--foreground)] shadow-xl focus:outline-none"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Ajustes de lectura</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar ajustes"
            className="rounded-full p-2 hover:bg-[var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]/70">Fondo</h3>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => update({ theme: t.id })}
                aria-pressed={settings.theme === t.id}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${
                  settings.theme === t.id ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border)]"
                }`}
              >
                <span
                  className="flex h-10 w-full items-center justify-center rounded"
                  style={{ background: t.bg, color: t.fg, border: "1px solid rgba(128,128,128,.3)" }}
                >
                  Aa
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]/70">Tipografía</h3>
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => (
              <button
                key={f.id}
                onClick={() => update({ font: f.id })}
                aria-pressed={settings.font === f.id}
                className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${
                  settings.font === f.id ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border)]"
                }`}
                style={{ fontFamily: f.family }}
              >
                <span className="text-xl">{f.sample}</span>
                {f.label}
              </button>
            ))}
          </div>
        </section>

        <SliderField
          label="Tamaño de letra"
          value={settings.fontSize}
          min={14}
          max={40}
          step={1}
          unit="px"
          onChange={(v) => update({ fontSize: v })}
        />
        <SliderField
          label="Interlineado"
          value={settings.lineHeight}
          min={1.2}
          max={2.4}
          step={0.1}
          onChange={(v) => update({ lineHeight: v })}
        />
        <SliderField
          label="Espaciado entre letras"
          value={settings.letterSpacing}
          min={0}
          max={0.15}
          step={0.01}
          unit="em"
          onChange={(v) => update({ letterSpacing: v })}
        />
        <SliderField
          label="Espaciado entre palabras"
          value={settings.wordSpacing}
          min={0}
          max={0.5}
          step={0.05}
          unit="em"
          onChange={(v) => update({ wordSpacing: v })}
        />
        <SliderField
          label="Ancho del texto"
          value={settings.contentWidth}
          min={320}
          max={900}
          step={20}
          unit="px"
          onChange={(v) => update({ contentWidth: v })}
        />

        <section>
          <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]/70">Alineación</h3>
          <div className="flex gap-2">
            <button
              onClick={() => update({ textAlign: "left" })}
              aria-pressed={settings.textAlign === "left"}
              className={`flex-1 rounded-lg border p-2 text-sm ${
                settings.textAlign === "left" ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              Izquierda
            </button>
            <button
              onClick={() => update({ textAlign: "justify" })}
              aria-pressed={settings.textAlign === "justify"}
              className={`flex-1 rounded-lg border p-2 text-sm ${
                settings.textAlign === "justify" ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              Justificado
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <label htmlFor="focus-mode" className="text-sm font-semibold text-[var(--foreground)]/70">
              Modo enfoque por párrafo
            </label>
            <input
              id="focus-mode"
              type="checkbox"
              checked={settings.focusMode}
              onChange={(e) => update({ focusMode: e.target.checked })}
              className="h-6 w-6 accent-[var(--accent)]"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--foreground)]/60">
            Resalta el párrafo que estás leyendo y atenúa el resto para que te sea más fácil ubicarte.
          </p>
          {settings.focusMode && (
            <div className="mt-3">
              <SliderField
                label="Intensidad del atenuado"
                value={settings.focusDimOpacity}
                min={0}
                max={0.8}
                step={0.05}
                onChange={(v) => update({ focusDimOpacity: v })}
              />
            </div>
          )}
        </section>

        <button
          onClick={reset}
          className="mt-2 rounded-lg border border-[var(--border)] p-2.5 text-sm font-medium hover:bg-[var(--surface-muted)]"
        >
          Restablecer valores por defecto
        </button>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-semibold text-[var(--foreground)]/70">{label}</label>
        <span className="text-sm tabular-nums text-[var(--foreground)]/60">
          {value}
          {unit ?? ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Disminuir ${label}`}
          onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg hover:bg-[var(--surface-muted)]"
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
          aria-label={label}
        />
        <button
          type="button"
          aria-label={`Aumentar ${label}`}
          onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg hover:bg-[var(--surface-muted)]"
        >
          +
        </button>
      </div>
    </div>
  );
}
