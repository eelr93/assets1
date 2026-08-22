import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
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
