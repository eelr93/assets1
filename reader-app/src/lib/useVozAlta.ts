"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * LECTURA EN VOZ ALTA
 * ===================
 *
 * Usa el sintetizador de voz que ya trae el navegador (`speechSynthesis`). No
 * hay servidor, no hay clave, no hay costo, y en el teléfono usa las voces del
 * sistema, así que funciona sin internet.
 *
 * Para quien fue operada de cataratas esto no es un adorno: permite seguir el
 * libro cuando los ojos se cansan, y mirar la pantalla solo cuando quiere.
 *
 * ── Las tres trampas que resuelve ───────────────────────────────────────────
 *
 * 1. **Safari en iPhone exige un gesto del usuario.** `speak()` solo arranca si
 *    lo dispara un toque. Encadenar el párrafo siguiente desde el `onend` del
 *    anterior falla de forma intermitente, así que acá **se encolan todos los
 *    párrafos de una sola vez** desde el toque inicial y cada uno avisa cuándo
 *    empieza a sonar. Es lo que hace que el resaltado siga a la voz.
 *
 * 2. **Chrome corta la voz cerca de los 15 segundos.** Es un error viejo y
 *    conocido; el remedio aceptado es un `pause()` + `resume()` periódico
 *    mientras habla. Molesta escribirlo, pero sin eso los párrafos largos se
 *    cortan por la mitad.
 *
 * 3. **Las voces cargan tarde.** En el primer render la lista suele estar
 *    vacía y se llena después, por eso se escucha `voiceschanged`.
 */

export type EstadoVoz = "detenido" | "leyendo" | "pausado";

const VELOCIDADES = [0.7, 0.85, 1, 1.15, 1.3] as const;

export function useVozAlta({
  parrafos,
  onParrafo,
}: {
  parrafos: string[];
  onParrafo?: (indice: number) => void;
}) {
  const [disponible, setDisponible] = useState(false);
  const [estado, setEstado] = useState<EstadoVoz>("detenido");
  const [indice, setIndice] = useState(0);
  const [velocidad, setVelocidad] = useState(1);

  const vozRef = useRef<SpeechSynthesisVoice | null>(null);

  // Distingue un final natural de uno provocado por `cancel()`, que también
  // dispara `onend` en todas las locuciones pendientes.
  const cancelandoRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // Durante el prerender no existe `window`, así que esto no se puede saber
    // en el primer render sin romper la hidratación. Es el caso legítimo de
    // setState dentro de un efecto, igual que en SettingsContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisponible(true);

    const elegirVoz = () => {
      const voces = window.speechSynthesis.getVoices();
      if (voces.length === 0) return;
      // Preferir una voz en español; si el dispositivo no tiene ninguna, el
      // navegador usa la suya por defecto y se entiende igual.
      vozRef.current =
        voces.find((v) => v.lang.toLowerCase().startsWith("es-ar")) ??
        voces.find((v) => v.lang.toLowerCase().startsWith("es")) ??
        null;
    };

    elegirVoz();
    window.speechSynthesis.addEventListener("voiceschanged", elegirVoz);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", elegirVoz);
  }, []);

  const detener = useCallback(() => {
    if (!disponible) return;
    cancelandoRef.current = true;
    window.speechSynthesis.cancel();
    setEstado("detenido");
  }, [disponible]);

  // Al salir del capítulo o cerrar el lector, la voz tiene que callarse: sigue
  // sonando aunque el componente desaparezca.
  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  /**
   * Encola desde un párrafo hasta el final del capítulo.
   *
   * La velocidad entra por parámetro y no se lee del estado porque cambiarla
   * obliga a rearmar la cola: una locución ya encolada no se puede acelerar.
   * Pasarla explícitamente evita tener que esperar a que el estado se actualice.
   */
  const comenzar = useCallback(
    (desde = 0, vel: number = velocidad) => {
      if (!disponible) return;

      cancelandoRef.current = true;
      window.speechSynthesis.cancel();
      cancelandoRef.current = false;

      const pendientes = parrafos
        .map((texto, i) => ({ texto, i }))
        .filter(({ texto, i }) => i >= desde && texto.length > 0);

      if (pendientes.length === 0) {
        setEstado("detenido");
        return;
      }

      pendientes.forEach(({ texto, i }, posicion) => {
        const locucion = new SpeechSynthesisUtterance(texto);
        locucion.lang = vozRef.current?.lang ?? "es-ES";
        if (vozRef.current) locucion.voice = vozRef.current;
        locucion.rate = vel;

        locucion.onstart = () => {
          setIndice(i);
          onParrafo?.(i);
        };

        // Solo el último decide que terminó el capítulo.
        if (posicion === pendientes.length - 1) {
          locucion.onend = () => {
            if (cancelandoRef.current) return;
            setEstado("detenido");
          };
        }

        window.speechSynthesis.speak(locucion);
      });

      setEstado("leyendo");
    },
    [disponible, parrafos, velocidad, onParrafo]
  );

  const pausar = useCallback(() => {
    if (!disponible) return;
    window.speechSynthesis.pause();
    setEstado("pausado");
  }, [disponible]);

  const reanudar = useCallback(() => {
    if (!disponible) return;
    window.speechSynthesis.resume();
    setEstado("leyendo");
  }, [disponible]);

  // Remedio al corte de Chrome a los ~15 segundos (ver punto 2 arriba).
  useEffect(() => {
    if (estado !== "leyendo") return;
    const latido = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(latido);
  }, [estado]);

  /** Cambiar la velocidad exige rearmar la cola: ya no se puede tocar la que suena. */
  const cambiarVelocidad = useCallback(
    (nueva: number) => {
      setVelocidad(nueva);
      // Se rearma desde el párrafo actual, con la velocidad nueva pasada a mano
      // porque el estado todavía no se actualizó en este mismo tick.
      if (estado === "leyendo") comenzar(indice, nueva);
    },
    [estado, indice, comenzar]
  );

  return {
    disponible,
    estado,
    indice,
    velocidad,
    velocidades: VELOCIDADES,
    comenzar,
    pausar,
    reanudar,
    detener,
    cambiarVelocidad,
  };
}
