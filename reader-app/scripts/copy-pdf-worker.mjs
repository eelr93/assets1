import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const destDir = path.join(root, "public");
const dest = path.join(destDir, "pdf.worker.min.mjs");

await mkdir(destDir, { recursive: true });
await copyFile(src, dest);
console.log("pdf.worker.min.mjs copiado a public/");
