"use client";

import { useEffect, useState } from "react";
import {
  borrarVoz,
  descargarVoz,
  idsDescargados,
  instalarVozIncluida,
  REGIONES_VOZ,
  VOCES_NATURALES,
  VOZ_INCLUIDA,
  vozNaturalSoportada,
  type IdVozNatural,
} from "@/lib/vozNatural";

/**
 * Elegir y descargar una voz neuronal.
 *
 * Estas voces suenan bastante más humanas que las del sistema, pero hay que
 * bajarlas: son entre 21 y 114 MB cada una. Por eso acá se dice el peso antes de
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
  /**
   * Qué se está bajando y cuánto va.
   *
   * Se guardan los bytes y no un porcentaje ya calculado porque el total puede
   * no venir: algunos servidores no mandan el tamaño. Con los bytes crudos se
   * puede mostrar los megas que van, que es honesto; con un porcentaje sacado
   * de un total en cero, la barra se queda clavada en 0 % y parece rota.
   */
  const [bajando, setBajando] = useState<{ id: IdVozNatural; cargado: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Al abrir, instala sola la voz incluida si todavía no está.
   *
   * Viaja con la app, así que sale de nuestro propio servidor: no hay que
   * elegir nada ni esperar a Hugging Face. La idea es que haya una voz natural
   * andando de entrada; las otras son mejores, pero hay que ir a buscarlas.
   *
   * Si falla, no se muestra el error como si alguien lo hubiera pedido: nadie
   * pidió esto. Queda como una voz más para descargar a mano.
   */
  useEffect(() => {
    // Durante el prerender no hay navegador que consultar, así que esto no se
    // puede saber en el primer render sin romper la hidratación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportada(vozNaturalSoportada());
    if (!vozNaturalSoportada()) return;

    let vivo = true;
    (async () => {
      let ids = await idsDescargados();
      if (!vivo) return;
      setDescargadas(ids);

      if (ids.includes(VOZ_INCLUIDA)) return;
      setBajando({ id: VOZ_INCLUIDA, cargado: 0, total: 0 });
      try {
        await instalarVozIncluida((cargado, total) => {
          if (vivo) setBajando({ id: VOZ_INCLUIDA, cargado, total });
        });
        ids = await idsDescargados();
        if (vivo) setDescargadas(ids);
      } catch (err) {
        console.error(err);
      } finally {
        if (vivo) setBajando(null);
      }
    })();

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
    setBajando({ id, cargado: 0, total: 0 });
    try {
      await descargarVoz(id, (cargado, total) => {
        setBajando({ id, cargado, total });
      });
      setDescargadas(await idsDescargados());
      onElegir(id);
    } catch (err) {
      console.error(err);
      // Se muestra el motivo real y no un texto genérico. El genérico decía
      // "fijate que haya internet" para cualquier falla, incluso cuando el
      // problema era otro: así no hay forma de saber si falta espacio, si el
      // navegador no deja guardar o si de verdad no hay señal.
      setError(err instanceof Error ? err.message : "No se pudo descargar la voz.");
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
      setError(err instanceof Error ? err.message : "No se pudo borrar la voz.");
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

      {/*
        Agrupadas por región y, cuando hay ancho, en dos columnas. Son siete
        voces: en una sola columna angosta la lista se vuelve un rollo largo en
        el que las de España tapan a las de acá, que son las que más se van a
        usar. En el teléfono queda de a una, que es lo único que entra.
      */}
      {REGIONES_VOZ.map((region) => (
        <div key={region} className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/45">
            {region}
          </h4>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {VOCES_NATURALES.filter((v) => v.region === region).map((v) => {
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
                    <span className="min-w-0 font-medium">{v.nombre}</span>
                    {enUso ? (
                      <span className="shrink-0 text-xs font-semibold text-[var(--accent)]">
                        En uso
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs tabular-nums text-[var(--foreground)]/45">
                        {v.megas} MB
                      </span>
                    )}
                  </div>
                  <span className="flex-1 text-xs leading-relaxed text-[var(--foreground)]/55">
                    {v.detalle}
                  </span>

                  {bajandoEsta ? (
                    <Avance cargado={bajando.cargado} total={bajando.total} />
                  ) : (
                    // Los botones se envuelven: "Dejar de usarla" y "Borrar" no
                    // entran juntos en una columna de teléfono angosto, y
                    // apretados terminan en dos renglones de texto cortado.
                    <div className="flex flex-wrap gap-2">
                      {!bajada ? (
                        <button
                          onClick={() => bajar(v.id)}
                          disabled={bajando !== null}
                          className="min-h-11 flex-1 rounded-lg border border-[var(--border)] px-3 text-sm font-medium transition hover:bg-[var(--surface-muted)] disabled:opacity-40"
                        >
                          Descargar
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onElegir(enUso ? null : v.id)}
                            className={`min-h-11 flex-1 basis-28 rounded-lg border px-3 text-sm font-medium transition ${
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
        </div>
      ))}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
}

/**
 * Cuánto va de la descarga.
 *
 * Tres estados, y los tres importan porque las esperas son largas:
 *
 * - **Con total conocido**, barra y porcentaje.
 * - **Sin total** —hay servidores que no mandan el tamaño—, los megas que van.
 *   Un porcentaje calculado sobre un total en cero se queda clavado en 0 % y
 *   parece que se rompió.
 * - **Terminada la bajada**, "guardando": escribir 60 o 100 MB lleva su rato
 *   después de que la barra llegó al final, y sin este aviso parece que se
 *   colgó justo al terminar.
 */
function Avance({ cargado, total }: { cargado: number; total: number }) {
  const megas = (n: number) => (n / 1048576).toFixed(0);
  const porcentaje = total > 0 ? Math.round((cargado * 100) / total) : null;
  const guardando = porcentaje !== null && porcentaje >= 100;

  return (
    <div className="flex flex-col gap-1">
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className={`h-full rounded-full bg-[var(--accent)] ${
            porcentaje === null ? "animate-pulse" : "transition-[width]"
          }`}
          style={{ width: porcentaje === null ? "100%" : `${porcentaje}%` }}
        />
      </div>
      <span className="text-xs text-[var(--foreground)]/55">
        {guardando
          ? "Guardando en el teléfono… puede tardar un momento"
          : porcentaje === null
            ? `Descargando… ${megas(cargado)} MB`
            : `Descargando… ${porcentaje}% de ${megas(total)} MB`}
      </span>
    </div>
  );
}
