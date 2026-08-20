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
 * 2. **La posición se lleva aparte, con decimales.** A estas velocidades cada
 *    cuadro mueve una fracción de píxel. Sumarle esa fracción a `scrollTop`
 *    directamente no sirve: el navegador la redondea y la suma se pierde, así
 *    que el texto no se mueve nunca. Se lleva la posición en una variable
 *    propia y se la escribe entera cada cuadro.
 */

/**
 * Velocidades ofrecidas, en renglones por minuto, con nombre en lugar de número.
 *
 * "Normal" está calibrada contra la lectura en voz alta, que ronda las 150
 * palabras por minuto: con el ancho de columna de la app son unos 18 renglones.
 * Los primeros números que puse eran bastante más lentos y el resultado era que
 * el desplazamiento parecía roto — a 12 renglones por minuto el texto se mueve
 * medio centímetro cada diez segundos, que mirándolo de frente es lo mismo que
 * estar quieto.
 */
export const VELOCIDADES_SCROLL = [
  { renglones: 8, etiqueta: "Muy lenta" },
  { renglones: 13, etiqueta: "Lenta" },
  { renglones: 18, etiqueta: "Normal" },
  { renglones: 26, etiqueta: "Rápida" },
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
    const caja = contenedor.current;
    if (!caja) return;

    /*
      Cuál es el elemento que realmente se desplaza.

      El lector arma su propia caja con `overflow-y: auto`, y normalmente es esa
      la que scrollea. Pero según cómo resuelva el navegador las alturas del
      flex —y iOS resuelve distinto cuando aparece y desaparece la barra de
      direcciones— puede terminar scrolleando la página entera. Escribirle
      `scrollTop` a un elemento que no scrollea no falla ni avisa: simplemente
      no pasa nada, que es exactamente el síntoma que hubo que perseguir acá.
    */
    const puedeScrollear = (n: Element) => n.scrollHeight - n.clientHeight > 4;
    const el = puedeScrollear(caja)
      ? caja
      : document.scrollingElement ?? document.documentElement;

    const pxPorSegundo = (renglonesPorMinuto * altoDeRenglon) / 60;
    let cuadro = 0;
    let anterior = performance.now();

    // La posición se lleva acá, con decimales, porque `scrollTop` redondea y a
    // menos de un píxel por cuadro la suma se perdería entera.
    let posicion = el.scrollTop;
    let ultimoEscrito = el.scrollTop;

    const paso = (ahora: number) => {
      const dt = Math.min(ahora - anterior, 100); // una pestaña que vuelve del fondo no salta media página
      anterior = ahora;

      // Si arrastró con el dedo, el scroll se movió por fuera de acá. Se retoma
      // desde donde quedó en lugar de tironear de vuelta a donde íbamos.
      if (Math.abs(el.scrollTop - ultimoEscrito) > 2) posicion = el.scrollTop;

      posicion += (pxPorSegundo * dt) / 1000;
      el.scrollTop = posicion;
      ultimoEscrito = el.scrollTop;

      // Tolerancia de 2 px: con zoom del navegador las alturas quedan
      // fraccionarias y la igualdad exacta no se alcanza nunca. Y un capítulo
      // más corto que la pantalla no cuenta como "llegó al final" — no tiene
      // adónde desplazarse, y si contara saltaría capítulos solo.
      if (puedeScrollear(el) && el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
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
