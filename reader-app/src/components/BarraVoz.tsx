"use client";

import type { EstadoVoz } from "@/lib/useVozAlta";

/**
 * Controles de la lectura en voz alta.
 *
 * Flota sobre el texto, cerca del pulgar, y solo se despliega entera cuando
 * está leyendo: en reposo es un único botón grande. Los botones miden 48 px
 * como mínimo, que es el tamaño a partir del cual se acierta sin apuntar —
 * importa cuando quien usa la app no ve del todo bien.
 */
export function BarraVoz({
  estado,
  velocidad,
  velocidades,
  onLeer,
  onPausar,
  onReanudar,
  onDetener,
  onVelocidad,
}: {
  estado: EstadoVoz;
  velocidad: number;
  velocidades: readonly number[];
  onLeer: () => void;
  onPausar: () => void;
  onReanudar: () => void;
  onDetener: () => void;
  onVelocidad: (v: number) => void;
}) {
  const activo = estado !== "detenido";

  const marco =
    "pointer-events-auto flex items-center gap-1 rounded-full border px-1.5 py-1.5 shadow-lg backdrop-blur";
  const estiloMarco = {
    background: "color-mix(in srgb, var(--read-bg) 88%, transparent)",
    borderColor: "color-mix(in srgb, var(--read-fg) 20%, transparent)",
  };
  const boton =
    "flex h-12 items-center justify-center rounded-full transition hover:bg-[color-mix(in_srgb,var(--read-fg)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  if (!activo) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={onLeer}
          className={`${marco} ${boton} gap-2 px-5 font-medium`}
          style={estiloMarco}
        >
          <IconoAltavoz />
          Escuchar
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className={marco} style={estiloMarco}>
        {estado === "leyendo" ? (
          <button onClick={onPausar} aria-label="Pausar la lectura" className={`${boton} w-12`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        ) : (
          <button onClick={onReanudar} aria-label="Seguir leyendo" className={`${boton} w-12`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z" />
            </svg>
          </button>
        )}

        <button onClick={onDetener} aria-label="Detener la lectura" className={`${boton} w-12`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>

        <div
          className="mx-1 h-7 w-px shrink-0"
          style={{ background: "color-mix(in srgb, var(--read-fg) 20%, transparent)" }}
          aria-hidden
        />

        <label className="sr-only" htmlFor="velocidad-voz">
          Velocidad de lectura
        </label>
        <select
          id="velocidad-voz"
          value={velocidad}
          onChange={(e) => onVelocidad(Number(e.target.value))}
          className="h-12 rounded-full bg-transparent px-2 text-sm font-medium"
        >
          {velocidades.map((v) => (
            <option key={v} value={v} style={{ color: "#111" }}>
              {v}×
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IconoAltavoz() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
    </svg>
  );
}
