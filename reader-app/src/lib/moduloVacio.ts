/**
 * Módulo vacío a propósito.
 *
 * El modelo de voz neuronal viene compilado con Emscripten y trae adentro la
 * variante de Node, que hace `require("fs")` detrás de una comprobación que en
 * el navegador nunca se cumple. El empaquetador no ejecuta esa comprobación:
 * ve el `require` y falla. Apuntando `fs` y `path` acá, el empaquetado termina
 * y la rama que los usaría sigue sin ejecutarse jamás.
 *
 * Ver `next.config.ts`.
 */
const moduloVacio = {};
export default moduloVacio;
