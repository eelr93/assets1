/// <reference lib="webworker" />

/**
 * HILO DE LA VOZ NATURAL
 * ======================
 *
 * Genera el audio con un modelo neuronal (Piper / VITS) que corre acá adentro,
 * sin servidor y sin clave. El modelo se baja una vez y queda guardado en el
 * teléfono; después funciona sin internet.
 *
 * ── Por qué un hilo aparte y no la pestaña principal ────────────────────────
 *
 * Generar un párrafo tarda entre uno y varios segundos. Hecho en el hilo
 * principal, ese rato la pantalla queda congelada: no se puede desplazar, ni
 * pausar, ni salir. En un lector eso es inaceptable, y encima el congelamiento
 * caería justo cuando la voz está por seguir.
 *
 * Acá el modelo trabaja aparte y la pestaña sigue respondiendo. El precio es
 * que todo va por mensajes, de ahí el ida y vuelta con `id` de cada pedido.
 */

import type { VoiceId } from "@diffusionstudio/vits-web";

export type PedidoVozNatural =
  | { id: number; tipo: "descargar"; voz: VoiceId }
  | { id: number; tipo: "sintetizar"; voz: VoiceId; texto: string }
  | { id: number; tipo: "guardadas" }
  | { id: number; tipo: "borrar"; voz: VoiceId };

export type RespuestaVozNatural =
  | { id: number; tipo: "listo"; datos?: unknown }
  | { id: number; tipo: "audio"; wav: Blob }
  | { id: number; tipo: "guardadas"; voces: string[] }
  | { id: number; tipo: "avance"; cargado: number; total: number }
  | { id: number; tipo: "error"; mensaje: string };

const alPrincipal = (m: RespuestaVozNatural) => self.postMessage(m);

self.onmessage = async (e: MessageEvent<PedidoVozNatural>) => {
  const pedido = e.data;
  try {
    // La biblioteca arrastra el runtime de ONNX, que son varios megas. Se carga
    // recién acá, la primera vez que hace falta: quien no use la voz natural no
    // paga nada por que exista.
    const tts = await import("@diffusionstudio/vits-web");

    switch (pedido.tipo) {
      case "descargar":
        await tts.download(pedido.voz, (p) =>
          alPrincipal({ id: pedido.id, tipo: "avance", cargado: p.loaded, total: p.total })
        );
        alPrincipal({ id: pedido.id, tipo: "listo" });
        break;

      case "sintetizar": {
        const wav = await tts.predict({ text: pedido.texto, voiceId: pedido.voz });
        alPrincipal({ id: pedido.id, tipo: "audio", wav });
        break;
      }

      case "guardadas": {
        const voces = await tts.stored();
        alPrincipal({ id: pedido.id, tipo: "guardadas", voces });
        break;
      }

      case "borrar":
        await tts.remove(pedido.voz);
        alPrincipal({ id: pedido.id, tipo: "listo" });
        break;
    }
  } catch (err) {
    alPrincipal({
      id: pedido.id,
      tipo: "error",
      mensaje: err instanceof Error ? err.message : String(err),
    });
  }
};
