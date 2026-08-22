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
 * Hay un segundo motivo, que apareció después: **guardar los modelos solo se
 * puede desde un hilo**. Ver `guardarArchivo`.
 *
 * ── De la biblioteca se usa una sola cosa ───────────────────────────────────
 *
 * Solo `predict`, que es la que genera el audio. Bajar, guardar, listar y
 * borrar están escritos acá, porque los de la biblioteca no funcionan en
 * iPhone y fallan sin decir nada:
 *
 * - Su `download` no espera a que termine la escritura (descarta la promesa),
 *   así que avisa "listo" cuando todavía no guardó nada.
 * - Y guarda con `createWritable()`, que Safari no tiene hasta iOS 17, dentro
 *   de un `try/catch` que solo hace `console.error`. En un iPhone eso es:
 *   descarga 60 MB, no guarda nada, y no se entera nadie.
 *
 * Los nombres de archivo que se usan acá son los mismos que espera `predict`
 * cuando busca en su caché, así que sigue encontrando todo.
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
  | { id: number; tipo: "instalarIncluida"; voz: IdVoz }
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
 * La dirección se arma como `${BASE}/${ruta}`, y `BASE` apunta al espejo: es
 * una constante importada y no se puede cambiar. La ruta sí, así que la de
 * estas dos sube cuatro niveles y baja al repositorio original.
 *
 * Quitar los `..` es parte de cómo se normaliza cualquier dirección web
 * (RFC 3986), lo hace el propio navegador antes de pedir nada, y el resultado
 * está verificado contra el servidor.
 *
 * Sigue haciendo falta aunque el bajar y el guardar ahora sean nuestros: la
 * biblioteca usa este mismo mapa para encontrar el modelo al generar.
 */
const AL_REPOSITORIO_ORIGINAL = "../../../../rhasspy/piper-voices/resolve/main";

const VOCES_AGREGADAS: Record<string, string> = {
  "es_AR-daniela-high": `${AL_REPOSITORIO_ORIGINAL}/es/es_AR/daniela/high/es_AR-daniela-high.onnx`,
  "es_MX-ald-x_low": `${AL_REPOSITORIO_ORIGINAL}/es/es_MX/ald/x_low/es_MX-ald-x_low.onnx`,
};

// ── Guardado en el disco del navegador ──────────────────────────────────────

type CarpetaOPFS = FileSystemDirectoryHandle & {
  keys: () => AsyncIterableIterator<string>;
};

/** Manija de escritura sincrónica: la única vía que ofrece Safari, y solo en un hilo. */
type ManijaSincronica = {
  truncate: (n: number) => void;
  write: (datos: Uint8Array, opciones?: { at: number }) => number;
  flush: () => void;
  close: () => void;
};

async function carpeta(): Promise<CarpetaOPFS> {
  const raiz = await navigator.storage.getDirectory();
  // "piper" es el nombre que usa la biblioteca para buscar; tiene que coincidir.
  return (await raiz.getDirectoryHandle("piper", { create: true })) as CarpetaOPFS;
}

/**
 * Escribe un archivo, por la vía que el navegador ofrezca.
 *
 * **Este es el arreglo que hacía falta.** La biblioteca usa solo
 * `createWritable()`, que Safari en iPhone no tiene hasta iOS 17. Como además
 * se traga el error, el resultado era una descarga completa que no guardaba
 * nada y no avisaba: la voz nunca aparecía en la lista.
 *
 * `createSyncAccessHandle()` sí está en Safari desde hace rato, pero **solo
 * funciona dentro de un hilo**, que es una de las razones por las que todo esto
 * vive acá.
 *
 * Se prueba primero la sincrónica justamente porque es la que cubre el caso
 * difícil; donde existen las dos, las dos sirven.
 */
async function guardarArchivo(nombre: string, datos: ArrayBuffer) {
  // Las dos vías se declaran opcionales porque justamente lo son: cuál existe
  // depende del navegador, y ese es todo el punto de esta función.
  const manija = (await (await carpeta()).getFileHandle(nombre, { create: true })) as
    FileSystemFileHandle & {
      createSyncAccessHandle?: () => Promise<ManijaSincronica>;
      createWritable?: () => Promise<FileSystemWritableFileStream>;
    };

  if (typeof manija.createSyncAccessHandle === "function") {
    const escritura = await manija.createSyncAccessHandle();
    try {
      escritura.truncate(0);
      escritura.write(new Uint8Array(datos), { at: 0 });
      escritura.flush();
    } finally {
      escritura.close();
    }
    return;
  }

  if (typeof manija.createWritable === "function") {
    const escritura = await manija.createWritable();
    await escritura.write(datos);
    await escritura.close();
    return;
  }

  throw new Error("Este navegador no deja guardar archivos grandes.");
}

/**
 * Las voces guardadas de verdad.
 *
 * Una voz cuenta solo si están **los dos** archivos: el modelo y su
 * configuración. Con uno solo, generar falla más tarde y de forma confusa; es
 * preferible que aparezca como no descargada y se pueda volver a bajar.
 */
async function listarGuardadas(): Promise<string[]> {
  const dir = await carpeta();
  const nombres = new Set<string>();
  for await (const nombre of dir.keys()) nombres.add(nombre);

  return [...nombres]
    .filter((n) => n.endsWith(".onnx"))
    .map((n) => n.slice(0, -".onnx".length))
    .filter((id) => nombres.has(`${id}.onnx.json`));
}

async function borrarArchivos(voz: IdVoz) {
  const dir = await carpeta();
  for (const nombre of [`${voz}.onnx`, `${voz}.onnx.json`]) {
    try {
      await dir.removeEntry(nombre);
    } catch {
      // Que no esté no es un problema: el resultado buscado es el mismo.
    }
  }
}

// ── Descarga ────────────────────────────────────────────────────────────────

/** Baja un archivo informando el avance. Falla fuerte si el servidor no lo da. */
async function bajar(url: string, onAvance?: (cargado: number, total: number) => void) {
  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(`El servidor respondió ${respuesta.status} al pedir ${url.split("/").at(-1)}`);
  }
  if (!respuesta.body) return respuesta.arrayBuffer();

  const total = Number(respuesta.headers.get("Content-Length") ?? 0);
  const lector = respuesta.body.getReader();
  const trozos: Uint8Array[] = [];
  let cargado = 0;

  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value);
    cargado += value.length;
    onAvance?.(cargado, total);
  }

  const entero = new Uint8Array(cargado);
  let posicion = 0;
  for (const t of trozos) {
    entero.set(t, posicion);
    posicion += t.length;
  }
  return entero.buffer;
}

/**
 * Baja los dos archivos de una voz y los guarda.
 *
 * La configuración va primero aunque pese unos pocos kilobytes: si algo está
 * mal —la ruta, el permiso del navegador para guardar— se falla en un segundo
 * en lugar de después de cien megas.
 */
async function bajarVoz(
  base: string,
  ruta: string,
  voz: IdVoz,
  avisar: (cargado: number, total: number) => void
) {
  const url = `${base}/${ruta}`;
  await guardarArchivo(`${voz}.onnx.json`, await bajar(`${url}.json`));
  await guardarArchivo(`${voz}.onnx`, await bajar(url, avisar));

  // Se comprueba en lugar de darlo por hecho: guardar puede fallar en silencio
  // si el teléfono se quedó sin lugar, y eso hay que decirlo ahora y no cuando
  // se intente leer un libro.
  if (!(await listarGuardadas()).includes(voz)) {
    throw new Error("Se descargó pero no quedó guardada. Puede faltar espacio en el teléfono.");
  }
}

// ── Generar el audio, reusando el modelo ────────────────────────────────────

/**
 * EL MOTOR, ARMADO UNA VEZ
 * ========================
 *
 * El `predict` de la biblioteca, por cada párrafo, vuelve a hacer todo desde
 * cero: lee los veinte megas del modelo del disco, los parsea y arma la sesión
 * de ONNX entera. En una computadora se disimula; en un teléfono son varios
 * segundos **por párrafo**, y se notan como un silencio largo cada vez que
 * termina uno.
 *
 * Acá la sesión y la configuración se arman una sola vez por voz y se guardan.
 * Lo único que queda por párrafo es lo que de verdad depende del texto:
 * convertirlo a fonemas y correr el modelo.
 *
 * Si algo de esto falla —una versión nueva que cambie las piezas, un navegador
 * que no coopere— se vuelve al `predict` de la biblioteca y se deja de intentar
 * el camino rápido. Prefiero que ande lento a que no ande.
 */
type Motor = {
  voz: IdVoz;
  sesion: import("onnxruntime-web").InferenceSession;
  config: {
    espeak: { voice: string };
    audio: { sample_rate: number };
    inference: { noise_scale: number; length_scale: number; noise_w: number };
    speaker_id_map?: Record<string, number>;
  };
};

let motor: Motor | null = null;
let hayCaminoRapido = true;

async function leerDelDisco(nombre: string): Promise<ArrayBuffer> {
  const manija = await (await carpeta()).getFileHandle(nombre);
  return (await manija.getFile()).arrayBuffer();
}

async function obtenerMotor(voz: IdVoz, ONNX_BASE: string): Promise<Motor> {
  if (motor?.voz === voz) return motor;

  const ort = await import("onnxruntime-web");
  ort.env.allowLocalModels = false;
  ort.env.wasm.wasmPaths = ONNX_BASE;
  // Varios hilos exigen que la página esté aislada entre orígenes, y no lo
  // está. Pedirlos igual no rompe —ONNX se queda en uno— pero dejarlo escrito
  // aclara que la lentitud no es por acá.
  ort.env.wasm.numThreads = 1;

  // Si había otra voz cargada, se suelta antes de armar la nueva: son veinte
  // megas cada una y en un teléfono no sobra la memoria.
  if (motor) {
    try {
      await motor.sesion.release();
    } catch {
      // Que no se pueda soltar no es motivo para no seguir.
    }
    motor = null;
  }

  const config = JSON.parse(new TextDecoder().decode(await leerDelDisco(`${voz}.onnx.json`)));
  const sesion = await ort.InferenceSession.create(await leerDelDisco(`${voz}.onnx`));

  motor = { voz, sesion, config };
  return motor;
}

/** Texto a fonemas, con espeak-ng compilado a WebAssembly. */
async function aFonemas(vozEspeak: string, texto: string, WASM_BASE: string): Promise<number[]> {
  const { createPiperPhonemize } = await import("piper-phonemize");

  // El resultado no vuelve como valor de retorno: el programa lo "imprime". Por
  // eso la promesa se arma antes y sus manijas quedan a mano de los callbacks.
  let resolver!: (ids: number[]) => void;
  let rechazar!: (e: Error) => void;
  const salida = new Promise<number[]>((si, no) => {
    resolver = si;
    rechazar = no;
  });

  const modulo = await createPiperPhonemize({
    print: (linea) => resolver(JSON.parse(linea).phoneme_ids),
    printErr: (linea) => rechazar(new Error(linea)),
    locateFile: (archivo) =>
      archivo.endsWith(".wasm")
        ? `${WASM_BASE}.wasm`
        : archivo.endsWith(".data")
          ? `${WASM_BASE}.data`
          : archivo,
  });

  modulo.callMain([
    "-l",
    vozEspeak,
    "--input",
    JSON.stringify([{ text: texto.trim() }]),
    "--espeak_data",
    "/espeak-ng-data",
  ]);

  return salida;
}

/** Envuelve las muestras crudas en un WAV de 16 bits, que es lo que sabe reproducir un `<audio>`. */
function aWav(muestras: Float32Array, frecuencia: number): ArrayBuffer {
  const CANALES = 1;
  const BITS = 16;
  const CABECERA = 44;

  const vista = new DataView(new ArrayBuffer(muestras.length * 2 + CABECERA));
  const texto = (posicion: number, valor: string) => {
    for (let i = 0; i < valor.length; i++) vista.setUint8(posicion + i, valor.charCodeAt(i));
  };

  texto(0, "RIFF");
  vista.setUint32(4, vista.buffer.byteLength - 8, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  vista.setUint32(16, 16, true); // largo del bloque de formato
  vista.setUint16(20, 1, true); // 1 = PCM sin comprimir
  vista.setUint16(22, CANALES, true);
  vista.setUint32(24, frecuencia, true);
  vista.setUint32(28, (frecuencia * CANALES * BITS) / 8, true); // bytes por segundo
  vista.setUint16(32, (CANALES * BITS) / 8, true); // bytes por muestra
  vista.setUint16(34, BITS, true);
  texto(36, "data");
  vista.setUint32(40, muestras.length * 2, true);

  let posicion = CABECERA;
  for (const muestra of muestras) {
    // Recortado a mano: el modelo puede pasarse de 1 y ahí la conversión daría
    // la vuelta, que se escucha como un chasquido.
    const acotada = muestra > 1 ? 1 : muestra < -1 ? -1 : muestra;
    vista.setInt16(posicion, acotada < 0 ? acotada * 32768 : acotada * 32767, true);
    posicion += 2;
  }

  return vista.buffer;
}

async function generarRapido(
  voz: IdVoz,
  texto: string,
  ONNX_BASE: string,
  WASM_BASE: string
): Promise<Blob> {
  const ort = await import("onnxruntime-web");
  const { sesion, config } = await obtenerMotor(voz, ONNX_BASE);

  const fonemas = await aFonemas(config.espeak.voice, texto, WASM_BASE);
  const entradas: Record<string, unknown> = {
    input: new ort.Tensor("int64", fonemas, [1, fonemas.length]),
    input_lengths: new ort.Tensor("int64", [fonemas.length]),
    scales: new ort.Tensor("float32", [
      config.inference.noise_scale,
      config.inference.length_scale,
      config.inference.noise_w,
    ]),
  };

  // Los modelos con varias voces adentro necesitan que se les diga cuál.
  if (Object.keys(config.speaker_id_map ?? {}).length) {
    entradas.sid = new ort.Tensor("int64", [0]);
  }

  const { output } = await sesion.run(
    entradas as Parameters<typeof sesion.run>[0]
  );
  return new Blob([aWav(output.data as Float32Array, config.audio.sample_rate)], {
    type: "audio/x-wav",
  });
}

/**
 * Las generaciones van de a una, en fila.
 *
 * `predict` arma un modelo nuevo por llamada, releyendo los veinte megas cada
 * vez. Dos a la vez es el doble de memoria y el doble de trabajo justo en el
 * momento en que el teléfono ya está ocupado reproduciendo — y en un teléfono
 * modesto eso lo tumba.
 *
 * Pasa naturalmente: mientras suena un párrafo se pide el siguiente, y si al
 * terminar el actual el siguiente todavía no está, llega un pedido más. La
 * caché del lado del lector evita que se pida dos veces lo mismo; esta fila
 * evita que se solapen pedidos de párrafos distintos.
 *
 * Solo se encolan las generaciones. Preguntar qué voces hay guardadas no tiene
 * por qué esperar a que termine de hablar.
 */
let fila: Promise<unknown> = Promise.resolve();

function enFila<T>(trabajo: () => Promise<T>): Promise<T> {
  // Se encadena tanto en éxito como en error: un fallo no tiene que trabar la
  // fila para siempre.
  const proximo = fila.then(trabajo, trabajo);
  fila = proximo.catch(() => {});
  return proximo;
}

self.onmessage = async (e: MessageEvent<PedidoVozNatural>) => {
  const pedido = e.data;
  const avisar = (cargado: number, total: number) =>
    alPrincipal({ id: pedido.id, tipo: "avance", cargado, total });

  try {
    // La biblioteca arrastra el runtime de ONNX, que son varios megas. Se carga
    // recién acá, la primera vez que hace falta.
    const tts = await import("@diffusionstudio/vits-web");
    Object.assign(tts.PATH_MAP, VOCES_AGREGADAS);

    switch (pedido.tipo) {
      case "descargar":
        await bajarVoz(tts.HF_BASE, tts.PATH_MAP[pedido.voz as VoiceId], pedido.voz, avisar);
        alPrincipal({ id: pedido.id, tipo: "listo" });
        break;

      // La voz incluida viaja con la app, así que sale de nuestro propio
      // servidor: sin permisos de otro dominio de por medio, más cerca y más
      // rápida. Lo que se guarda queda igual que el de cualquier otra.
      case "instalarIncluida":
        await bajarVoz(`${self.location.origin}/voces`, `${pedido.voz}.onnx`, pedido.voz, avisar);
        alPrincipal({ id: pedido.id, tipo: "listo" });
        break;

      case "sintetizar": {
        const wav = await enFila(async () => {
          if (hayCaminoRapido) {
            try {
              return await generarRapido(pedido.voz, pedido.texto, tts.ONNX_BASE, tts.WASM_BASE);
            } catch (err) {
              // Una sola vez: si el camino rápido no anda en este navegador, no
              // tiene sentido reintentarlo en cada párrafo. Se sigue con el de
              // la biblioteca, que es lento pero seguro.
              console.error("Voz natural: se vuelve al camino lento.", err);
              hayCaminoRapido = false;
              motor = null;
            }
          }
          return tts.predict({ text: pedido.texto, voiceId: pedido.voz as VoiceId });
        });
        alPrincipal({ id: pedido.id, tipo: "audio", wav });
        break;
      }

      case "guardadas":
        alPrincipal({ id: pedido.id, tipo: "guardadas", voces: await listarGuardadas() });
        break;

      case "borrar":
        // Si la voz que se borra es la que está cargada, el motor tiene que
        // soltarla: si no, seguiría hablando con un modelo que ya no existe.
        if (motor?.voz === pedido.voz) motor = null;
        await borrarArchivos(pedido.voz);
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
