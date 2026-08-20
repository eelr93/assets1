"use client";

import { useEffect, useState } from "react";
import {
  borrarVoz,
  descargarVoz,
  idsDescargados,
  VOCES_NATURALES,
  vozNaturalSoportada,
  type IdVozNatural,
} from "@/lib/vozNatural";

/**
 * Elegir y descargar una voz neuronal.
 *
 * Estas voces suenan bastante más humanas que las del sistema, pero hay que
 * bajarlas: son entre 28 y 77 MB cada una. Por eso acá se dice el peso antes de
 * tocar nada, la descarga muestra en qué va, y se puede borrar lo bajado sin
 * tener que buscar en los ajustes del teléfono.
 *
 * La voz del sistema sigue siendo la de fábrica. Esto es opcional a propósito:
 * generar el audio le cuesta trabajo al teléfono y en uno viejo puede quedarse
 * corto. Si no anda, se apaga y no se perdió nada.
 */
export function PanelVozNatural({
  elegida,
  onElegir,
}: {
  elegida: string | null;
  onElegir: (id: IdVozNatural | null) => void;
}) {
  const [soportada, setSoportada] = useState(true);
  const [descargadas, setDescargadas] = useState<IdVozNatural[]>([]);
  const [bajando, setBajando] = useState<{ id: IdVozNatural; porcentaje: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Durante el prerender no hay navegador que consultar, así que esto no se
    // puede saber en el primer render sin romper la hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportada(vozNaturalSoportada());
    if (!vozNaturalSoportada()) return;
    let vivo = true;
    idsDescargados().then((ids) => {
      if (vivo) setDescargadas(ids);
    });
    return () => {
      vivo = false;
    };
  }, []);

  if (!soportada) {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-[var(--foreground)]/70">Voz natural</h3>
        <p className="text-xs leading-relaxed text-[var(--foreground)]/55">
          Este navegador no puede guardar los modelos de voz. Probá desde Safari o Chrome
          actualizados.
        </p>
      </section>
    );
  }

  const bajar = async (id: IdVozNatural) => {
    setError(null);
    setBajando({ id, porcentaje: 0 });
    try {
      await descargarVoz(id, (cargado, total) => {
        // `total` llega en 0 cuando el servidor no manda el tamaño; ahí se deja
        // la barra quieta en vez de mostrar un porcentaje inventado.
        if (total > 0) setBajando({ id, porcentaje: Math.round((cargado * 100) / total) });
      });
      setDescargadas(await idsDescargados());
      onElegir(id);
    } catch (err) {
      console.error(err);
      setError("No se pudo descargar la voz. Fijate que haya internet y volvé a probar.");
    } finally {
      setBajando(null);
    }
  };

  const borrar = async (id: IdVozNatural) => {
    try {
      await borrarVoz(id);
      if (elegida === id) onElegir(null);
      setDescargadas(await idsDescargados());
    } catch (err) {
      console.error(err);
      setError("No se pudo borrar la voz.");
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-[var(--foreground)]/70">Voz natural</h3>
      <p className="text-xs leading-relaxed text-[var(--foreground)]/55">
        Voces que suenan bastante más humanas que las del sistema. Se bajan una vez y después
        funcionan sin internet. Le dan más trabajo al teléfono: si se entrecorta, volvé a la voz
        del sistema.
      </p>

      <ul className="flex flex-col gap-2">
        {VOCES_NATURALES.map((v) => {
          const bajada = descargadas.includes(v.id);
          const enUso = elegida === v.id;
          const bajandoEsta = bajando?.id === v.id;

          return (
            <li
              key={v.id}
              className={`flex flex-col gap-2 rounded-xl border p-3 ${
                enUso ? "border-[var(--accent)]" : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{v.nombre}</span>
                {enUso && (
                  <span className="shrink-0 text-xs font-semibold text-[var(--accent)]">En uso</span>
                )}
              </div>
              <span className="text-xs leading-relaxed text-[var(--foreground)]/55">{v.detalle}</span>

              {bajandoEsta ? (
                <div className="flex flex-col gap-1">
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width]"
                      style={{ width: `${bajando.porcentaje}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--foreground)]/55">
                    Descargando… {bajando.porcentaje}% de {v.megas} MB
                  </span>
                </div>
              ) : (
                <div className="flex gap-2">
                  {!bajada ? (
                    <button
                      onClick={() => bajar(v.id)}
                      disabled={bajando !== null}
                      className="min-h-11 flex-1 rounded-lg border border-[var(--border)] px-3 text-sm font-medium transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
                    >
                      Descargar {v.megas} MB
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onElegir(enUso ? null : v.id)}
                        className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium transition ${
                          enUso
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                            : "border-[var(--border)] hover:bg-[var(--surface-muted)]"
                        }`}
                      >
                        {enUso ? "Dejar de usarla" : "Usar esta voz"}
                      </button>
                      <button
                        onClick={() => borrar(v.id)}
                        className="min-h-11 rounded-lg border border-[var(--border)] px-3 text-sm transition hover:bg-[var(--surface-muted)]"
                      >
                        Borrar
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}
