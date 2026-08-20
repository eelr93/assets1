"use client";

import type { VoiceId } from "@diffusionstudio/vits-web";
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
 * - Son entre 25 y 110 MB de descarga por voz, una sola vez.
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
 * Las voces que se ofrecen, elegidas a mano del catálogo completo.
 *
 * Del catálogo del paquete se dejan afuera las de calidad baja, que suenan peor
 * que la voz del sistema y no justifican ni la descarga ni la espera: si va a
 * costar 60 MB tiene que sonar mejor, si no es todo pérdida.
 *
 * No hay voz argentina: existe una (`es_AR-daniela`) en el repositorio original
 * de Piper, pero no está en el catálogo que publica este paquete. La mexicana es
 * la más cercana en oído rioplatense.
 */
export const VOCES_NATURALES = [
  {
    id: "es_MX-claude-high" as VoiceId,
    nombre: "Claudia — México",
    detalle: "La más natural. 63 MB, y la que más tarda en generar.",
    megas: 63,
  },
  {
    id: "es_ES-davefx-medium" as VoiceId,
    nombre: "David — España",
    detalle: "Voz masculina, equilibrada. 63 MB.",
    megas: 63,
  },
  {
    id: "es_ES-sharvard-medium" as VoiceId,
    nombre: "Sara — España",
    detalle: "Voz femenina, dicción muy clara. 77 MB.",
    megas: 77,
  },
  {
    id: "es_MX-ald-medium" as VoiceId,
    nombre: "Alicia — México",
    detalle: "Más liviana de generar que las otras. 63 MB.",
    megas: 63,
  },
  {
    id: "es_ES-carlfm-x_low" as VoiceId,
    nombre: "Carlos — España (liviana)",
    detalle: "Suena peor pero pesa 28 MB y genera rápido. Para teléfonos justos.",
    megas: 28,
  },
] as const;

export type IdVozNatural = (typeof VOCES_NATURALES)[number]["id"];

let hilo: Worker | null = null;
let proximoId = 1;

type Pendiente = {
  resolver: (v: unknown) => void;
  rechazar: (e: Error) => void;
  onAvance?: (cargado: number, total: number) => void;
};
const pendientes = new Map<number, Pendiente>();

function obtenerHilo(): Worker {
  if (hilo) return hilo;
  hilo = new Worker(new URL("./vozNatural.worker.ts", import.meta.url), { type: "module" });

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

export const descargarVoz = (voz: VoiceId, onAvance?: (cargado: number, total: number) => void) =>
  pedir<void>({ tipo: "descargar", voz }, onAvance);

export const sintetizar = (voz: VoiceId, texto: string) =>
  pedir<Blob>({ tipo: "sintetizar", voz, texto });

export const vocesGuardadas = () => pedir<string[]>({ tipo: "guardadas" });

export const borrarVoz = (voz: VoiceId) => pedir<void>({ tipo: "borrar", voz });

/**
 * Qué voces del catálogo ya están bajadas.
 *
 * La biblioteca devuelve nombres de archivo (`.../es_MX-ald-medium.onnx`), no
 * identificadores, así que se compara por contenido en lugar de por igualdad.
 */
export async function idsDescargados(): Promise<IdVozNatural[]> {
  try {
    const archivos = await vocesGuardadas();
    return VOCES_NATURALES.map((v) => v.id).filter((id) =>
      archivos.some((a) => a.includes(id))
    ) as IdVozNatural[];
  } catch {
    return [];
  }
}
