import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * TRAE LA VOZ QUE VIAJA CON LA APP
 * ================================
 *
 * Deja `public/voces/es_MX-ald-x_low.*` para que haya una voz natural lista sin
 * que nadie tenga que salir a buscarla. Es la más liviana del catálogo, 20 MiB,
 * y se instala sola la primera vez que se abren las opciones de voz.
 *
 * ── Por qué se baja en el build y no está en el repositorio ─────────────────
 *
 * Son 20 MiB de binario. Metidos en el repositorio quedan ahí para siempre y en
 * cada copia; bajados en el build, el sitio los sirve igual y el repositorio
 * queda limpio. Es lo mismo que ya se hacía con el worker de PDF.
 *
 * Cloudflare Pages no acepta archivos de más de 25 MiB, así que la voz incluida
 * tiene que ser esta. Las otras se bajan desde Hugging Face cuando se piden.
 */

const VOZ = "es_MX-ald-x_low";
const ORIGEN = `https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/x_low/${VOZ}.onnx`;
const TOPE_CLOUDFLARE = 25 * 1024 * 1024;

const aca = dirname(fileURLToPath(import.meta.url));
const destino = resolve(aca, "../public/voces");

await mkdir(destino, { recursive: true });

for (const sufijo of ["", ".json"]) {
  const archivo = resolve(destino, `${VOZ}.onnx${sufijo}`);

  // Ya está: no se vuelve a bajar en cada build.
  try {
    const info = await stat(archivo);
    if (info.size > 0) {
      console.log(`voz incluida: ${VOZ}.onnx${sufijo} ya está (${(info.size / 1048576).toFixed(1)} MiB)`);
      continue;
    }
  } catch {
    // No existe todavía.
  }

  console.log(`voz incluida: bajando ${VOZ}.onnx${sufijo}…`);
  const respuesta = await fetch(`${ORIGEN}${sufijo}`);
  if (!respuesta.ok) {
    throw new Error(`No se pudo bajar ${VOZ}.onnx${sufijo}: HTTP ${respuesta.status}`);
  }

  const datos = Buffer.from(await respuesta.arrayBuffer());
  if (datos.length > TOPE_CLOUDFLARE) {
    throw new Error(
      `${VOZ}.onnx${sufijo} pesa ${(datos.length / 1048576).toFixed(1)} MiB y Cloudflare Pages ` +
        `no acepta más de 25 MiB. Hay que elegir otra voz para incluir.`
    );
  }

  await writeFile(archivo, datos);
  console.log(`voz incluida: ${VOZ}.onnx${sufijo} listo (${(datos.length / 1048576).toFixed(1)} MiB)`);
}
