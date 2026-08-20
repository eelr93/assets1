"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * DESPLAZAMIENTO AUTOMÁTICO
 * =========================
 *
 * Sube el texto solo, a velocidad regulable, para poder leer con la vista sin
 * tener que arrastrar con el dedo cada pocos renglones.
 *
 * Es la contraparte de la voz: la voz sirve cuando los ojos se cansaron, esto
 * sirve cuando los ojos van bien pero el gesto de arrastrar molesta — que
 * después de una cirugía de cataratas es bastante seguido, porque obliga a
 * despegar la vista del renglón y volver a encontrarlo.
 *
 * ── Dos detalles que no son obvios ──────────────────────────────────────────
 *
 * 1. **La velocidad se mide en renglones por minuto, no en píxeles.** Ella
 *    cambia el tamaño de letra todo el tiempo; una velocidad en píxeles que a
 *    22 px es cómoda, a 40 px se siente el doble de rápida. El cálculo a
 *    píxeles se hace acá, con el alto de renglón real.
 *
 * 2. **El sobrante se acumula entre cuadros.** A velocidades bajas cada cuadro
 *    mueve menos de un píxel. Si se redondeara cuadro a cuadro el texto no se
 *    movería nunca; guardando la fracción, avanza parejo.
 */

/** Velocidades ofrecidas, en renglones por minuto, con nombre en lugar de número. */
export const VELOCIDADES_SCROLL = [
  { renglones: 5, etiqueta: "Muy lenta" },
  { renglones: 8, etiqueta: "Lenta" },
  { renglones: 12, etiqueta: "Normal" },
  { renglones: 17, etiqueta: "Rápida" },
] as const;

export function useDesplazamientoAuto({
  contenedor,
  renglonesPorMinuto,
  altoDeRenglon,
  clave,
  hayMas,
  onFinal,
}: {
  contenedor: React.RefObject<HTMLDivElement | null>;
  renglonesPorMinuto: number;
  /** Alto de un renglón en píxeles: tamaño de letra por interlineado. */
  altoDeRenglon: number;
  /**
   * Cambiar este valor rearma el bucle. Es el número de capítulo: al llegar al
   * fondo el bucle deja de pedir cuadros, así que sin esto seguiría "encendido"
   * y quieto en el capítulo siguiente.
   */
  clave: unknown;
  /**
   * Si queda algo después de este capítulo. Va acá y no del lado de quien lo
   * usa para que el bucle pueda apagarse solo al llegar al final del libro, sin
   * tener que llamar a una función que todavía no existe cuando se arma.
   */
  hayMas: boolean;
  /** Se llama al llegar al fondo habiendo más para seguir. */
  onFinal?: () => void;
}) {
  const [activo, setActivo] = useState(false);

  // `onFinal` cambia de identidad en cada render del lector. Por ref para que
  // el bucle no se rearme constantemente y pierda el sobrante acumulado.
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    if (!activo) return;
    const el = contenedor.current;
    if (!el) return;

    const pxPorSegundo = (renglonesPorMinuto * altoDeRenglon) / 60;
    let cuadro = 0;
    let anterior = performance.now();
    let sobrante = 0;

    const paso = (ahora: number) => {
      const dt = Math.min(ahora - anterior, 100); // una pestaña que vuelve del fondo no salta media página
      anterior = ahora;

      sobrante += (pxPorSegundo * dt) / 1000;
      const entero = Math.floor(sobrante);
      if (entero > 0) {
        sobrante -= entero;
        el.scrollTop += entero;
      }

      // Tolerancia de 2 px: con zoom del navegador las alturas quedan
      // fraccionarias y la igualdad exacta no se alcanza nunca. Y un capítulo
      // más corto que la pantalla no cuenta como "llegó al final" — no tiene
      // adónde desplazarse, y si contara saltaría capítulos solo.
      const hayRecorrido = el.scrollHeight - el.clientHeight > 4;
      if (hayRecorrido && el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        // Se deja de pedir cuadros; el bucle se rearma cuando cambie `clave`.
        if (hayMas) onFinalRef.current?.();
        else setActivo(false);
        return;
      }

      cuadro = requestAnimationFrame(paso);
    };

    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [activo, contenedor, renglonesPorMinuto, altoDeRenglon, clave, hayMas]);

  const alternar = useCallback(() => setActivo((v) => !v), []);
  const detener = useCallback(() => setActivo(false), []);

  return { activo, alternar, detener };
}
