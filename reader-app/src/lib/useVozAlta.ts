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

/** Minutos que ofrece el temporizador. `0` es "sin temporizador". */
const MINUTOS_TEMPORIZADOR = [0, 15, 30, 45, 60] as const;

export function useVozAlta({
  parrafos,
  onParrafo,
  onFinDelCapitulo,
}: {
  parrafos: string[];
  onParrafo?: (indice: number) => void;
  /**
   * Se llama cuando la voz terminó el último párrafo por su cuenta.
   *
   * No se dispara al detener ni al cambiar de capítulo a mano: solo cuando la
   * lectura llegó de verdad al final. El lector lo usa para seguir con el
   * capítulo siguiente sin que haya que tocar nada.
   */
  onFinDelCapitulo?: () => void;
}) {
  const [disponible, setDisponible] = useState(false);
  const [estado, setEstado] = useState<EstadoVoz>("detenido");
  const [indice, setIndice] = useState(0);
  const [velocidad, setVelocidad] = useState(1);

  /** Voces en español que ofrece el dispositivo, para poder elegir. */
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);
  const [vozElegida, setVozElegida] = useState<string>("");

  const vozRef = useRef<SpeechSynthesisVoice | null>(null);

  /**
   * Número de tanda, para distinguir un final de verdad de la sacudida que
   * deja `cancel()`.
   *
   * `cancel()` dispara `onend` sobre la locución que estaba sonando, y ese
   * evento llega **después**, en otro turno del bucle de eventos. Antes acá
   * había un booleano que se encendía justo antes de cancelar y se apagaba en
   * el renglón siguiente: para cuando el evento llegaba ya estaba apagado, así
   * que la cancelación se leía como "terminó el capítulo".
   *
   * En la práctica eso significaba que interrumpir la voz durante el último
   * párrafo de un capítulo saltaba al capítulo siguiente sola. Se llegaba
   * cambiando la velocidad o la voz ahí, y ahora también tocando un párrafo
   * para releer desde otro lado.
   *
   * Con un número, cada locución recuerda de qué tanda es y las viejas se
   * ignoran, no importa cuánto tarde el navegador en avisar.
   */
  const tandaRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // Durante el prerender no existe `window`, así que esto no se puede saber
    // en el primer render sin romper la hidratación. Es el caso legítimo de
    // setState dentro de un efecto, igual que en SettingsContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisponible(true);

    const elegirVoz = () => {
      const todas = window.speechSynthesis.getVoices();
      if (todas.length === 0) return;

      // Solo se ofrecen las voces en español: la lista completa de un teléfono
      // trae decenas de idiomas y elegir entre todas sería peor que no elegir.
      const enEspanol = todas.filter((v) => v.lang.toLowerCase().startsWith("es"));
      setVoces(enEspanol);

      // Preferir el español rioplatense; si no está, cualquier español. Sin
      // ninguno, el navegador usa su voz por defecto y se entiende igual.
      const preferida =
        enEspanol.find((v) => v.lang.toLowerCase().startsWith("es-ar")) ??
        enEspanol[0] ??
        null;
      vozRef.current = preferida;
      setVozElegida(preferida?.voiceURI ?? "");
    };

    elegirVoz();
    window.speechSynthesis.addEventListener("voiceschanged", elegirVoz);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", elegirVoz);
  }, []);

  const detener = useCallback(() => {
    if (!disponible) return;
    tandaRef.current++;
    window.speechSynthesis.cancel();
    setEstado("detenido");
  }, [disponible]);

  // Al salir del capítulo o cerrar el lector, la voz tiene que callarse: sigue
  // sonando aunque el componente desaparezca.
  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      tandaRef.current++;
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

      const tanda = ++tandaRef.current;
      window.speechSynthesis.cancel();

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
          if (tandaRef.current !== tanda) return;
          setIndice(i);
          onParrafo?.(i);
        };

        // Solo el último decide que terminó el capítulo.
        if (posicion === pendientes.length - 1) {
          locucion.onend = () => {
            if (tandaRef.current !== tanda) return;
            setEstado("detenido");
            onFinDelCapitulo?.();
          };
        }

        window.speechSynthesis.speak(locucion);
      });

      setEstado("leyendo");
    },
    [disponible, parrafos, velocidad, onParrafo, onFinDelCapitulo]
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

  // ── Temporizador para dormir ──────────────────────────────────────────────

  /** Momento en que la voz debe callarse, o `null` si no hay temporizador. */
  const [finProgramado, setFinProgramado] = useState<number | null>(null);
  const [minutosRestantes, setMinutosRestantes] = useState<number | null>(null);

  const programarTemporizador = useCallback((minutos: number) => {
    if (minutos > 0) {
      setFinProgramado(Date.now() + minutos * 60_000);
      setMinutosRestantes(minutos);
    } else {
      setFinProgramado(null);
      setMinutosRestantes(null);
    }
  }, []);

  useEffect(() => {
    if (finProgramado === null) return;

    // Se comprueba cada diez segundos y no cada segundo: lo que se muestra son
    // minutos, y un intervalo lento gasta menos batería en algo pensado
    // justamente para dejar andando mientras alguien se duerme.
    const reloj = setInterval(() => {
      const faltan = finProgramado - Date.now();
      if (faltan <= 0) {
        detener();
        setFinProgramado(null);
        setMinutosRestantes(null);
      } else {
        setMinutosRestantes(Math.ceil(faltan / 60_000));
      }
    }, 10_000);

    return () => clearInterval(reloj);
  }, [finProgramado, detener]);

  /**
   * Leer una frase suelta con una voz, para poder compararlas.
   *
   * Elegir voz a ciegas de una lista de nombres no sirve: "Mónica" y "Paulina"
   * no dicen nada hasta que se las escucha. Y probarlas arrancando un capítulo
   * entero cada vez es tan incómodo que en la práctica nadie cambia la voz que
   * viene puesta.
   */
  const probar = useCallback(
    (voiceURI?: string) => {
      if (!disponible) return;
      tandaRef.current++;
      window.speechSynthesis.cancel();

      const v = voiceURI ? voces.find((x) => x.voiceURI === voiceURI) ?? null : vozRef.current;
      const locucion = new SpeechSynthesisUtterance(
        "Así suena esta voz leyendo un renglón del libro."
      );
      locucion.lang = v?.lang ?? "es-ES";
      if (v) locucion.voice = v;
      locucion.rate = velocidad;
      window.speechSynthesis.speak(locucion);
    },
    [disponible, voces, velocidad]
  );

  /** Cambiar de voz, igual que la velocidad, obliga a rearmar la cola. */
  const cambiarVoz = useCallback(
    (voiceURI: string) => {
      const nueva = voces.find((v) => v.voiceURI === voiceURI) ?? null;
      vozRef.current = nueva;
      setVozElegida(voiceURI);
      if (estado === "leyendo") comenzar(indice);
    },
    [voces, estado, indice, comenzar]
  );

  return {
    disponible,
    estado,
    indice,
    velocidad,
    velocidades: VELOCIDADES,
    voces,
    vozElegida,
    minutosTemporizador: MINUTOS_TEMPORIZADOR,
    minutosRestantes,
    temporizadorActivo: finProgramado !== null,
    comenzar,
    pausar,
    reanudar,
    detener,
    cambiarVelocidad,
    cambiarVoz,
    probar,
    programarTemporizador,
  };
}
