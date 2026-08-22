"use client";

import type { PedidoVozNatural, RespuestaVozNatural } from "./vozNatural.worker";

/**
 * VOZ NATURAL
 * ===========
 *
 * Habla del lado del cliente con un modelo neuronal (Piper / VITS) en lugar del
 * sintetizador del sistema. No hay servidor, no hay clave y no hay costo: el
 * modelo se baja una vez y queda guardado en el teléfono.
 *
 * ── Qué esperar, con honestidad ─────────────────────────────────────────────
 *
 * No es magia y no está garantizado que ande bien en todos los teléfonos:
 *
 * - Son entre 21 y 114 MB de descarga por voz, una sola vez.
 * - Generar cada párrafo lleva su tiempo. Se genera el siguiente mientras suena
 *   el actual, pero en un teléfono viejo la voz puede quedarse esperando.
 * - En iPhone el navegador es más estricto con la memoria y puede cortar.
 *
 * Por eso la voz del sistema sigue siendo la de fábrica y esto es opcional: si
 * no anda o no gusta, no se pierde nada.
 *
 * Los modelos son de Rhasspy Piper, licencia MIT, y se bajan de Hugging Face.
 */

/**
 * Las voces que se ofrecen, elegidas a mano del catálogo de Piper.
 *
 * Van primero las latinoamericanas: es el acento de casa y es lo que menos
 * cansa escuchar durante horas.
 *
 * **En español no hay más que esto.** Piper tiene voz argentina y mexicanas; no
 * existen colombiana, chilena, peruana ni ninguna otra. No es una decisión de
 * acá, es todo lo que hay entrenado.
 *
 * Se dejan afuera las de calidad baja del catálogo (`mls_*-low`), que suenan
 * peor que la voz del sistema: si va a costar 60 MB tiene que sonar mejor, si
 * no es pérdida pura. La única "liviana" que queda es la mexicana chica, que
 * está por los teléfonos que no dan abasto con las otras.
 */
export const VOCES_NATURALES = [
  {
    id: "es_AR-daniela-high",
    nombre: "Daniela — Argentina",
    region: "Latinoamérica",
    detalle:
      "Acento rioplatense. La más pesada y la que más tarda en generar; si se entrecorta, probá una de las de abajo.",
    megas: 114,
  },
  {
    id: "es_MX-claude-high",
    nombre: "Claudia — México",
    region: "Latinoamérica",
    detalle: "Muy natural y bastante más liviana que la argentina.",
    megas: 63,
  },
  {
    id: "es_MX-ald-medium",
    nombre: "Alicia — México",
    region: "Latinoamérica",
    detalle: "Equilibrada: suena bien y le pide menos al teléfono.",
    megas: 63,
  },
  {
    id: "es_MX-ald-x_low",
    nombre: "Alicia — México (liviana)",
    region: "Latinoamérica",
    detalle: "Suena peor, pero es la más rápida de todas. Para teléfonos justos.",
    megas: 21,
  },
  {
    id: "es_ES-sharvard-medium",
    nombre: "Sara — España",
    region: "España",
    detalle: "Voz femenina, dicción muy clara.",
    megas: 77,
  },
  {
    id: "es_ES-davefx-medium",
    nombre: "David — España",
    region: "España",
    detalle: "Voz masculina, equilibrada.",
    megas: 63,
  },
  {
    id: "es_ES-carlfm-x_low",
    nombre: "Carlos — España (liviana)",
    region: "España",
    detalle: "Suena peor pero pesa poco y genera rápido.",
    megas: 28,
  },
] as const;

export type IdVozNatural = (typeof VOCES_NATURALES)[number]["id"];

/** Las regiones en el orden en que se muestran. */
export const REGIONES_VOZ = ["Latinoamérica", "España"] as const;

let hilo: Worker | null = null;
let proximoId = 1;

type Pendiente = {
  resolver: (v: unknown) => void;
  rechazar: (e: Error) => void;
  onAvance?: (cargado: number, total: number) => void;
};
const pendientes = new Map<number, Pendiente>();

/**
 * De dónde se carga el hilo.
 *
 * Es un archivo suelto en `public/`, armado por `scripts/construir-worker-voz.mjs`,
 * y no un `new URL("./vozNatural.worker.ts", import.meta.url)`. Se hizo así
 * porque esa forma no funcionaba: el empaquetador de Next no compilaba el hilo,
 * lo copiaba tal cual —TypeScript crudo, con el `import` del paquete sin
 * resolver— y encima quedaba con extensión `.ts`, así que el servidor lo
 * mandaba como `video/mp2t` y el navegador se negaba a ejecutarlo. Ver el
 * comentario largo en ese script.
 */
const RUTA_DEL_HILO = "/voz-natural.worker.js";

/** Corta de raíz todo lo que esté esperando, con un motivo. */
function fallarTodo(motivo: string) {
  for (const [id, p] of pendientes) {
    pendientes.delete(id);
    p.rechazar(new Error(motivo));
  }
}

function obtenerHilo(): Worker {
  if (hilo) return hilo;
  hilo = new Worker(RUTA_DEL_HILO, { type: "module" });

  /*
    Si el hilo no arranca, hay que enterarse.

    Sin esto, un hilo que no carga deja cada promesa esperando para siempre: la
    descarga se queda en cero, sin barra, sin error y sin nada que tocar. Fue
    exactamente lo que pasó cuando el archivo se servía con el tipo equivocado —
    desde afuera parecía que el botón no hacía nada.
  */
  hilo.onerror = () => {
    hilo = null;
    fallarTodo("No se pudo cargar el motor de la voz natural.");
  };
  hilo.onmessageerror = () => fallarTodo("El motor de la voz natural devolvió algo ilegible.");

  hilo.onmessage = (e: MessageEvent<RespuestaVozNatural>) => {
    const r = e.data;
    const p = pendientes.get(r.id);
    if (!p) return;

    // El avance de descarga llega muchas veces por pedido; el pedido sigue vivo.
    if (r.tipo === "avance") {
      p.onAvance?.(r.cargado, r.total);
      return;
    }

    pendientes.delete(r.id);
    if (r.tipo === "error") p.rechazar(new Error(r.mensaje));
    else if (r.tipo === "audio") p.resolver(r.wav);
    else if (r.tipo === "guardadas") p.resolver(r.voces);
    else p.resolver(undefined);
  };

  return hilo;
}

/**
 * El pedido sin su `id`, que lo pone `pedir`.
 *
 * `Omit` aplicado directo a una unión la aplasta a sus campos comunes y se
 * pierden `voz` y `texto`. El `T extends` hace que se reparta por cada variante
 * y cada una conserve lo suyo.
 */
type SinId<T> = T extends { id: number } ? Omit<T, "id"> : never;

function pedir<T>(
  pedido: SinId<PedidoVozNatural>,
  onAvance?: (cargado: number, total: number) => void
): Promise<T> {
  const id = proximoId++;
  const w = obtenerHilo();
  return new Promise<T>((resolver, rechazar) => {
    pendientes.set(id, {
      resolver: resolver as (v: unknown) => void,
      rechazar,
      onAvance,
    });
    w.postMessage({ ...pedido, id } as PedidoVozNatural);
  });
}

/**
 * El elemento de audio por el que sale la voz natural. Uno solo, de módulo.
 *
 * Es único a propósito y no un `ref` del componente. Safari en iPhone solo deja
 * sonar un `<audio>` que arrancó dentro de un toque del usuario, y ese permiso
 * queda pegado **a ese elemento**. Si se creara uno nuevo por capítulo o al
 * abrir otro libro habría que volver a conseguir el permiso cada vez, y como el
 * primer párrafo tarda en generarse, para entonces el toque ya no cuenta.
 *
 * Que sea de módulo también lo saca del alcance del compilador de React, que
 * con razón no quiere que se mute lo que guarda un `ref`.
 */
let audio: HTMLAudioElement | null = null;

export function obtenerAudio(): HTMLAudioElement {
  if (!audio) audio = new Audio();
  return audio;
}

/**
 * Deja el audio habilitado. Hay que llamarlo **dentro** del toque del usuario,
 * antes de ponerse a generar nada.
 */
export function habilitarAudio() {
  const a = obtenerAudio();
  a.src = SILENCIO;
  a.play().catch(() => {});
}

/** Un WAV de duración cero, para conseguir el permiso sin que suene nada. */
const SILENCIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

/** Si el navegador puede correr esto. Sin hilos ni almacenamiento propio, no. */
export function vozNaturalSoportada(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof navigator !== "undefined" &&
    // El modelo se guarda en el sistema de archivos privado del origen. Safari
    // lo tiene desde la 16.4; sin esto la descarga no se podría conservar y
    // habría que bajar 60 MB en cada apertura del libro.
    typeof navigator.storage?.getDirectory === "function"
  );
}

export const descargarVoz = (voz: IdVozNatural, onAvance?: (cargado: number, total: number) => void) =>
  pedir<void>({ tipo: "descargar", voz }, onAvance);

export const sintetizar = (voz: IdVozNatural, texto: string) =>
  pedir<Blob>({ tipo: "sintetizar", voz, texto });

export const vocesGuardadas = () => pedir<string[]>({ tipo: "guardadas" });

export const borrarVoz = (voz: IdVozNatural) => pedir<void>({ tipo: "borrar", voz });

/**
 * Qué voces del catálogo ya están bajadas.
 *
 * La comparación es exacta: la biblioteca devuelve identificadores, no rutas.
 * Antes esto miraba si uno contenía al otro, que con nombres como
 * `es_MX-ald-medium` y `es_MX-ald-x_low` es pedir que en algún momento una se
 * haga pasar por otra.
 */
export async function idsDescargados(): Promise<IdVozNatural[]> {
  try {
    const guardadas = await vocesGuardadas();
    return VOCES_NATURALES.map((v) => v.id).filter((id) => guardadas.includes(id));
  } catch {
    return [];
  }
}
