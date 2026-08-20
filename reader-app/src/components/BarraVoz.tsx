"use client";

import { useState } from "react";
import type { EstadoVoz } from "@/lib/useVozAlta";

/**
 * Controles de la lectura en voz alta.
 *
 * Flota sobre el texto, cerca del pulgar, y solo se despliega entera cuando
 * está leyendo: en reposo es un único botón grande. Los botones miden 48 px
 * como mínimo, que es el tamaño a partir del cual se acierta sin apuntar —
 * importa cuando quien usa la app no ve del todo bien.
 *
 * La velocidad, la voz y el temporizador viven detrás del botón de opciones y
 * no en la barra. Estaban todos afuera y en un teléfono angosto la barra se
 * partía en dos renglones: seis controles al alcance del pulgar es peor que
 * tres, aunque haya que tocar una vez más para llegar a los otros.
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
  voces,
  vozElegida,
  onVoz,
  minutosTemporizador,
  minutosRestantes,
  onTemporizador,
  navegacionFoco,
}: {
  estado: EstadoVoz;
  velocidad: number;
  velocidades: readonly number[];
  onLeer: () => void;
  onPausar: () => void;
  onReanudar: () => void;
  onDetener: () => void;
  onVelocidad: (v: number) => void;
  voces: SpeechSynthesisVoice[];
  vozElegida: string;
  onVoz: (voiceURI: string) => void;
  minutosTemporizador: readonly number[];
  minutosRestantes: number | null;
  onTemporizador: (minutos: number) => void;
  /**
   * Solo en modo enfoque: mover el párrafo resaltado sin tener que dejar el
   * texto a la altura justa. Van en esta misma barra y no como zonas táctiles
   * sobre el texto porque una zona invisible encima del párrafo impide
   * seleccionar y confunde: acá se ven, se tocan y no tapan nada.
   */
  navegacionFoco?: { anterior: () => void; siguiente: () => void };
}) {
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(false);
  const activo = estado !== "detenido";

  const marco =
    "pointer-events-auto flex items-center gap-1 rounded-full border px-1.5 py-1.5 shadow-lg backdrop-blur";
  const estiloMarco = {
    background: "color-mix(in srgb, var(--read-bg) 88%, transparent)",
    borderColor: "color-mix(in srgb, var(--read-fg) 20%, transparent)",
  };
  const boton =
    "flex h-12 items-center justify-center rounded-full transition hover:bg-[color-mix(in_srgb,var(--read-fg)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  const flechasFoco = navegacionFoco && (
    <div className={marco} style={estiloMarco}>
      <button onClick={navegacionFoco.anterior} aria-label="Párrafo anterior" className={`${boton} w-12`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button onClick={navegacionFoco.siguiente} aria-label="Párrafo siguiente" className={`${boton} w-12`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );

  const contenedor =
    "pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center justify-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]";

  return (
    <>
      {opcionesAbiertas && (
        <OpcionesVoz
          velocidad={velocidad}
          velocidades={velocidades}
          onVelocidad={onVelocidad}
          voces={voces}
          vozElegida={vozElegida}
          onVoz={onVoz}
          minutosTemporizador={minutosTemporizador}
          minutosRestantes={minutosRestantes}
          onTemporizador={onTemporizador}
          onCerrar={() => setOpcionesAbiertas(false)}
        />
      )}

      <div className={contenedor}>
        {flechasFoco}

        {!activo ? (
          <button onClick={onLeer} className={`${marco} ${boton} gap-2 px-5 font-medium`} style={estiloMarco}>
            <IconoAltavoz />
            Escuchar
          </button>
        ) : (
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

            <button
              onClick={() => setOpcionesAbiertas(true)}
              aria-label="Opciones de la voz"
              className={`${boton} ${minutosRestantes !== null ? "gap-1.5 px-3" : "w-12"}`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
              </svg>
              {/* El tiempo que falta se ve sin abrir nada: es el dato que se
                  quiere mirar de reojo antes de dormirse. */}
              {minutosRestantes !== null && (
                <span className="text-sm font-semibold tabular-nums">{minutosRestantes}′</span>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function OpcionesVoz({
  velocidad,
  velocidades,
  onVelocidad,
  voces,
  vozElegida,
  onVoz,
  minutosTemporizador,
  minutosRestantes,
  onTemporizador,
  onCerrar,
}: {
  velocidad: number;
  velocidades: readonly number[];
  onVelocidad: (v: number) => void;
  voces: SpeechSynthesisVoice[];
  vozElegida: string;
  onVoz: (voiceURI: string) => void;
  minutosTemporizador: readonly number[];
  minutosRestantes: number | null;
  onTemporizador: (minutos: number) => void;
  onCerrar: () => void;
}) {
  const opcion = (activa: boolean) =>
    `min-h-12 flex-1 rounded-xl border px-3 text-sm font-medium transition ${
      activa
        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
        : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
    }`;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Opciones de la voz"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div className="flex w-full max-w-md flex-col gap-5 rounded-t-2xl bg-[var(--background)] p-5 text-[var(--foreground)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Voz</h2>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[var(--surface-muted)]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--foreground)]/70">Velocidad</h3>
          <div className="flex gap-2">
            {velocidades.map((v) => (
              <button key={v} onClick={() => onVelocidad(v)} className={opcion(v === velocidad)}>
                {v}×
              </button>
            ))}
          </div>
        </section>

        {voces.length > 1 && (
          <section className="flex flex-col gap-2">
            <label htmlFor="voz-lectura" className="text-sm font-medium text-[var(--foreground)]/70">
              Voz
            </label>
            <select
              id="voz-lectura"
              value={vozElegida}
              onChange={(e) => onVoz(e.target.value)}
              className="min-h-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-base"
            >
              {voces.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--foreground)]/70">
            Dejar de leer
            {minutosRestantes !== null && (
              <span className="ml-1 text-[var(--accent)]">· faltan {minutosRestantes} min</span>
            )}
          </h3>
          <div className="flex flex-wrap gap-2">
            {minutosTemporizador.map((m) => (
              <button
                key={m}
                onClick={() => onTemporizador(m)}
                className={`${opcion(m === 0 ? minutosRestantes === null : false)} min-w-16`}
              >
                {m === 0 ? "Nunca" : `${m} min`}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-[var(--foreground)]/55">
            Para escuchar hasta quedarse dormida sin que el teléfono siga hablando toda la noche.
          </p>
        </section>
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
