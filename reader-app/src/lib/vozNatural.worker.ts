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

/**
 * El identificador de una voz.
 *
 * Es `string` y no el `VoiceId` de la biblioteca porque acá se agregan voces
 * que su catálogo no lista (ver `VOCES_AGREGADAS`). En las llamadas se afirma
 * el tipo: para la biblioteca son entradas válidas del mapa igual que las suyas.
 */
type IdVoz = string;

export type PedidoVozNatural =
  | { id: number; tipo: "descargar"; voz: IdVoz }
  | { id: number; tipo: "sintetizar"; voz: IdVoz; texto: string }
  | { id: number; tipo: "guardadas" }
  | { id: number; tipo: "borrar"; voz: IdVoz };

export type RespuestaVozNatural =
  | { id: number; tipo: "listo"; datos?: unknown }
  | { id: number; tipo: "audio"; wav: Blob }
  | { id: number; tipo: "guardadas"; voces: string[] }
  | { id: number; tipo: "avance"; cargado: number; total: number }
  | { id: number; tipo: "error"; mensaje: string };

const alPrincipal = (m: RespuestaVozNatural) => self.postMessage(m);

/**
 * Voces que la biblioteca no trae en su catálogo, agregadas a mano.
 *
 * La biblioteca baja los modelos de un espejo (`diffusionstudio/piper-voices`)
 * que está incompleto: no tiene la voz argentina ni la mexicana liviana, que sí
 * existen en el repositorio original de Piper (`rhasspy/piper-voices`).
 *
 * ── El truco de los `..`, y por qué es legítimo ─────────────────────────────
 *
 * La biblioteca arma la dirección como `${BASE}/${ruta}`, y `BASE` apunta al
 * espejo y no se puede cambiar: es una constante importada. Pero la ruta sí se
 * puede, porque `PATH_MAP` está exportado y es un objeto común.
 *
 * Entonces la ruta sube cuatro niveles y baja al repositorio original. No es un
 * parche sucio sobre una casualidad: quitar los `..` es parte de cómo se
 * normaliza cualquier dirección web (RFC 3986), lo hace el propio navegador
 * antes de pedir nada, y el resultado está verificado contra el servidor.
 *
 * Lo demás sigue funcionando solo: la biblioteca guarda y busca los archivos
 * por su nombre suelto, que no cambia, y para saber si una voz está bajada mira
 * este mismo mapa.
 */
const AL_REPOSITORIO_ORIGINAL = "../../../../rhasspy/piper-voices/resolve/main";

const VOCES_AGREGADAS: Record<string, string> = {
  "es_AR-daniela-high": `${AL_REPOSITORIO_ORIGINAL}/es/es_AR/daniela/high/es_AR-daniela-high.onnx`,
  "es_MX-ald-x_low": `${AL_REPOSITORIO_ORIGINAL}/es/es_MX/ald/x_low/es_MX-ald-x_low.onnx`,
};

/**
 * Espera a que la voz esté realmente escrita en el disco.
 *
 * Hace falta por un error de la biblioteca. Su `download` es, en esencia:
 *
 *     await Promise.all(archivos.map(async (u) => {
 *       guardar(u, await bajar(u));   // ← `guardar` es async y no lleva await
 *     }));
 *
 * La promesa de la escritura se descarta, así que `download` termina cuando
 * terminó de **bajar**, no cuando terminó de **guardar**. Con 63 o 114 MB, entre
 * una cosa y la otra pasa un rato largo.
 *
 * El síntoma era que la descarga llegaba al 100 %, y al preguntar enseguida qué
 * voces había guardadas todavía no figuraba ninguna: la voz recién bajada no
 * aparecía para elegir. Al reabrir el panel más tarde sí estaba, porque para
 * entonces la escritura había terminado.
 *
 * Se pregunta hasta que aparezca, con un tope: si en un minuto no está, algo
 * falló de verdad y es mejor decirlo que dejar la espera colgada.
 */
async function esperarAQueEsteGuardada(
  tts: typeof import("@diffusionstudio/vits-web"),
  voz: IdVoz
) {
  const limite = Date.now() + 60_000;
  while (Date.now() < limite) {
    // `stored()` se declara devolviendo solo las voces del catálogo propio,
    // pero devuelve lo que haya en el disco, incluidas las agregadas a mano.
    const guardadas: string[] = await tts.stored();
    if (guardadas.includes(voz)) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("La voz se descargó pero no se pudo guardar en el teléfono.");
}

self.onmessage = async (e: MessageEvent<PedidoVozNatural>) => {
  const pedido = e.data;
  try {
    // La biblioteca arrastra el runtime de ONNX, que son varios megas. Se carga
    // recién acá, la primera vez que hace falta: quien no use la voz natural no
    // paga nada por que exista.
    const tts = await import("@diffusionstudio/vits-web");
    Object.assign(tts.PATH_MAP, VOCES_AGREGADAS);

    switch (pedido.tipo) {
      case "descargar":
        await tts.download(pedido.voz as VoiceId, (p) =>
          alPrincipal({ id: pedido.id, tipo: "avance", cargado: p.loaded, total: p.total })
        );
        await esperarAQueEsteGuardada(tts, pedido.voz);
        alPrincipal({ id: pedido.id, tipo: "listo" });
        break;

      case "sintetizar": {
        const wav = await tts.predict({ text: pedido.texto, voiceId: pedido.voz as VoiceId });
        alPrincipal({ id: pedido.id, tipo: "audio", wav });
        break;
      }

      case "guardadas": {
        const voces = await tts.stored();
        alPrincipal({ id: pedido.id, tipo: "guardadas", voces });
        break;
      }

      case "borrar":
        await tts.remove(pedido.voz as VoiceId);
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
