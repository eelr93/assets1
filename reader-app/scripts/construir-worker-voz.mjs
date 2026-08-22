import { build } from "esbuild";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * EMPAQUETA EL HILO DE LA VOZ NATURAL
 * ===================================
 *
 * El hilo se arma acá y no con el empaquetador de Next. Hubo que hacerlo así
 * después de que la descarga de voces no funcionara en producción por dos
 * motivos, los dos invisibles desde el código:
 *
 * 1. **Turbopack no lo compilaba, lo copiaba.** Reconocía
 *    `new URL("./x.worker.ts", import.meta.url)` como una referencia a un
 *    archivo y lo publicaba tal cual: TypeScript crudo, con los tipos adentro y
 *    con el `import` del paquete sin resolver. Un hilo así no arranca ni de
 *    casualidad.
 *
 * 2. **Se servía como `video/mp2t`.** Al quedar con extensión `.ts`, el hosting
 *    le adivinaba el tipo y le ponía el de un video MPEG. Los navegadores son
 *    estrictos con el tipo de los módulos: con ese encabezado se niegan a
 *    ejecutarlo aunque el contenido sea correcto.
 *
 * Armándolo acá el resultado es un `.js` de verdad en `public/`, con todo
 * adentro y con el tipo que corresponde. De paso queda explícito qué se
 * empaqueta, en lugar de depender de que el empaquetador adivine bien.
 */

const aca = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aca, "..");
const salida = resolve(raiz, "public/voz-natural.worker.js");

await mkdir(dirname(salida), { recursive: true });

/**
 * Encuentra el fonemizador de Piper adentro de `vits-web`.
 *
 * Es el que pasa de texto a los números que come el modelo. No lo publica
 * ningún paquete por separado: viaja adentro de `vits-web`, en un archivo con
 * el nombre generado por su empaquetador (`piper-DeOu3H9E.js`) y sin estar
 * declarado en sus `exports`, así que no se puede importar por su nombre.
 *
 * Se busca por patrón en lugar de escribir el nombre a mano: si una versión
 * nueva lo renombra, se sigue encontrando igual. Y si de verdad desapareciera,
 * el build corta acá con un mensaje claro, que es mucho mejor que descubrirlo
 * cuando alguien aprieta "Escuchar" en su teléfono.
 */
const distDeVitsWeb = resolve(raiz, "node_modules/@diffusionstudio/vits-web/dist");
const archivoDelFonemizador = (await readdir(distDeVitsWeb)).find(
  (n) => n.startsWith("piper-") && n.endsWith(".js")
);

if (!archivoDelFonemizador) {
  throw new Error(
    `No se encontró el fonemizador de Piper en ${distDeVitsWeb}. ` +
      `Se buscaba un archivo "piper-*.js". Si @diffusionstudio/vits-web cambió de ` +
      `estructura, hay que revisar cómo se obtiene createPiperPhonemize.`
  );
}
console.log(`fonemizador: ${archivoDelFonemizador}`);

const resultado = await build({
  entryPoints: [resolve(raiz, "src/lib/vozNatural.worker.ts")],
  outfile: salida,
  bundle: true,
  format: "esm",
  platform: "browser",
  // Safari 16.4 es la primera versión de iPhone con el almacenamiento que hace
  // falta para guardar los modelos, así que no tiene sentido apuntar más abajo.
  target: ["safari16", "chrome110", "firefox115"],
  minify: true,
  // Sin esto esbuild escapa los acentos y "teléfono" queda como "tel\xE9fono":
  // el archivo se vuelve ilegible y buscar un texto adentro no encuentra nada.
  // Cuesta un rato darse cuenta de que el código estaba bien y lo que fallaba
  // era la búsqueda.
  charset: "utf8",
  sourcemap: false,
  legalComments: "none",
  alias: {
    "piper-phonemize": resolve(distDeVitsWeb, archivoDelFonemizador),
    // El modelo viene compilado con Emscripten y trae adentro la variante de
    // Node, que pide `fs` y `path` detrás de una comprobación que en el
    // navegador nunca se cumple. El empaquetador no ejecuta la comprobación:
    // ve el pedido y falla. Apuntarlos a un módulo vacío deja que termine, y la
    // rama que los usaría no corre nunca acá.
    fs: resolve(raiz, "src/lib/moduloVacio.ts"),
    path: resolve(raiz, "src/lib/moduloVacio.ts"),
  },
  logLevel: "info",
});

if (resultado.errors.length) process.exit(1);
