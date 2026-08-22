/**
 * El fonemizador de Piper: pasa de texto a los números que espera el modelo.
 *
 * No lo publica ningún paquete por separado. Viaja adentro de
 * `@diffusionstudio/vits-web`, en un archivo con el nombre generado por su
 * empaquetador, que no está declarado en sus `exports`. El build lo busca por
 * patrón y lo enlaza acá (ver `scripts/construir-worker-voz.mjs`), así que un
 * cambio de versión que renombre el archivo se sigue encontrando — y si de
 * verdad desaparece, el build falla con un mensaje claro en lugar de romperse
 * en el teléfono de alguien.
 */
declare module "piper-phonemize" {
  export function createPiperPhonemize(opciones: {
    /** Recibe la salida del programa: un JSON con `phoneme_ids`. */
    print: (linea: string) => void;
    printErr: (linea: string) => void;
    /** Dice dónde están el `.wasm` y el `.data` de espeak-ng. */
    locateFile: (archivo: string) => string;
  }): Promise<{ callMain: (argumentos: string[]) => void }>;
}
