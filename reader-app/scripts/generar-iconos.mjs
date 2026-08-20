import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * GENERA LOS ÍCONOS PNG A PARTIR DEL SVG
 * ======================================
 *
 * Corre solo con `npm run iconos`, no en cada build: el resultado se versiona.
 *
 * **Existe por iOS.** Android y Chrome leen el `manifest.webmanifest` y aceptan
 * el SVG sin problema. iPhone no: para "Agregar a pantalla de inicio" ignora el
 * manifiesto y busca un PNG llamado `apple-touch-icon`. Sin ese archivo, en vez
 * del ícono pone **una captura borrosa de la página**, que es exactamente lo
 * que hacía esta app antes.
 *
 * El de iOS se genera con fondo opaco a propósito: iOS no respeta la
 * transparencia y la rellena de negro.
 */

const aca = path.dirname(fileURLToPath(import.meta.url));
const publico = path.join(aca, "..", "public");

const salidas = [
  { archivo: "apple-touch-icon.png", tamano: 180, fondo: "#2b6cb0" }, // iPhone / iPad
  { archivo: "icon-192.png", tamano: 192, fondo: null }, // Android
  { archivo: "icon-512.png", tamano: 512, fondo: null }, // Android, pantalla de inicio
];

const svg = await readFile(path.join(publico, "icon.svg"));

for (const { archivo, tamano, fondo } of salidas) {
  let imagen = sharp(svg, { density: 400 }).resize(tamano, tamano);
  if (fondo) imagen = imagen.flatten({ background: fondo });

  await writeFile(path.join(publico, archivo), await imagen.png().toBuffer());
  console.log(`  ${archivo}  ${tamano}×${tamano}`);
}

console.log("\nÍconos generados en public/.");
