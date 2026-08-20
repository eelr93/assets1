"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { habilitarAudio, obtenerAudio, sintetizar, type IdVozNatural } from "./vozNatural";


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
  vozNaturalId,
  onParrafo,
  onFinDelCapitulo,
}: {
  parrafos: string[];
  /**
   * Si está puesta, se lee con el modelo neuronal en lugar del sintetizador del
   * sistema. Ver `vozNatural.ts` para lo que eso implica.
   */
  vozNaturalId?: IdVozNatural | null;
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
    // El número de tanda se sube siempre: aunque no haya sintetizador puede
    // estar sonando la voz natural, que no lo usa para nada.
    tandaRef.current++;
    const a = obtenerAudio();
    a.pause();
    a.removeAttribute("src");
    if (disponible) window.speechSynthesis.cancel();
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

  // ── Motor de la voz natural ───────────────────────────────────────────────

  const usandoNatural = Boolean(vozNaturalId);

  /** Se muestra si el modelo falla, para no dejar la app muda y sin explicación. */
  const [errorNatural, setErrorNatural] = useState<string | null>(null);

  /**
   * Audio ya generado, por índice de párrafo.
   *
   * Se guardan pocos a propósito. El audio sale sin comprimir: un párrafo largo
   * puede pesar más de un mega, y un capítulo entero llenaría la memoria del
   * teléfono a cambio de nada, porque nadie vuelve atrás treinta párrafos.
   */
  const audiosRef = useRef<Map<number, string>>(new Map());

  const olvidarAudios = useCallback((conservar: number[] = []) => {
    for (const [i, url] of audiosRef.current) {
      if (conservar.includes(i)) continue;
      URL.revokeObjectURL(url);
      audiosRef.current.delete(i);
    }
  }, []);

  // Al cambiar de capítulo el audio viejo no sirve más y ocupa lugar.
  useEffect(() => {
    olvidarAudios();
  }, [parrafos, olvidarAudios]);

  const generar = useCallback(
    async (i: number): Promise<string | null> => {
      if (!vozNaturalId) return null;
      const guardado = audiosRef.current.get(i);
      if (guardado) return guardado;

      const texto = parrafos[i];
      if (!texto) return null;

      const wav = await sintetizar(vozNaturalId, texto);
      const url = URL.createObjectURL(wav);
      audiosRef.current.set(i, url);
      return url;
    },
    [parrafos, vozNaturalId]
  );

  /** Reproduce una fuente y avisa si terminó de verdad o la interrumpieron. */
  const reproducir = useCallback((url: string, tanda: number) => {
    const a = obtenerAudio();
    return new Promise<boolean>((resolver) => {
      const limpiar = () => {
        a.removeEventListener("ended", alTerminar);
        a.removeEventListener("error", alFallar);
      };
      // Pausar no dispara `ended`, así que una pausa deja esta promesa
      // esperando — que es justo lo que se quiere: al reanudar sigue sola.
      const alTerminar = () => {
        limpiar();
        resolver(tandaRef.current === tanda);
      };
      const alFallar = () => {
        limpiar();
        resolver(false);
      };
      a.addEventListener("ended", alTerminar);
      a.addEventListener("error", alFallar);
      a.src = url;
      a.play().catch(() => alFallar());
    });
  }, []);

  /**
   * Lee de un párrafo hasta el final del capítulo con el modelo neuronal.
   *
   * Mientras suena un párrafo se va generando el siguiente. Sin eso habría un
   * silencio de varios segundos entre párrafo y párrafo, que en un libro es
   * insoportable; con eso, si el teléfono da abasto, no se nota nada.
   */
  const leerNatural = useCallback(
    async (desde: number, vel: number, tanda: number) => {
      const a = obtenerAudio();
      a.playbackRate = vel;
      setErrorNatural(null);

      for (let i = desde; i < parrafos.length; i++) {
        if (tandaRef.current !== tanda) return;
        if (!parrafos[i]) continue;

        let url: string | null;
        try {
          url = await generar(i);
        } catch (err) {
          if (tandaRef.current !== tanda) return;
          console.error(err);
          setErrorNatural(
            "No se pudo generar el audio con la voz natural. Probá con la voz del sistema."
          );
          setEstado("detenido");
          return;
        }
        if (tandaRef.current !== tanda) return;
        if (!url) continue;

        setIndice(i);
        onParrafo?.(i);

        // El siguiente se va generando de fondo; no se espera.
        const siguiente = parrafos.findIndex((t, k) => k > i && t.length > 0);
        if (siguiente !== -1) generar(siguiente).catch(() => {});

        // Se conservan el que suena y el que se está generando; el resto se
        // libera. El audio sale sin comprimir y un capítulo entero en memoria
        // sería mucho, a cambio de nada: nadie vuelve treinta párrafos atrás.
        olvidarAudios([i, siguiente]);

        const termino = await reproducir(url, tanda);
        if (!termino) return;
      }

      if (tandaRef.current !== tanda) return;
      setEstado("detenido");
      onFinDelCapitulo?.();
    },
    [parrafos, generar, reproducir, olvidarAudios, onParrafo, onFinDelCapitulo]
  );

  /**
   * Encola desde un párrafo hasta el final del capítulo.
   *
   * La velocidad entra por parámetro y no se lee del estado porque cambiarla
   * obliga a rearmar la cola: una locución ya encolada no se puede acelerar.
   * Pasarla explícitamente evita tener que esperar a que el estado se actualice.
   */
  const comenzar = useCallback(
    (desde = 0, vel: number = velocidad) => {
      if (usandoNatural) {
        const tanda = ++tandaRef.current;
        // Habilitar el audio **acá adentro**, mientras el toque todavía cuenta.
        habilitarAudio();
        setEstado("leyendo");
        leerNatural(desde, vel, tanda);
        return;
      }

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
    [disponible, parrafos, velocidad, onParrafo, onFinDelCapitulo, usandoNatural, leerNatural]
  );

  const pausar = useCallback(() => {
    if (usandoNatural) {
      obtenerAudio().pause();
      setEstado("pausado");
      return;
    }
    if (!disponible) return;
    window.speechSynthesis.pause();
    setEstado("pausado");
  }, [disponible, usandoNatural]);

  const reanudar = useCallback(() => {
    if (usandoNatural) {
      obtenerAudio().play().catch(() => {});
      setEstado("leyendo");
      return;
    }
    if (!disponible) return;
    window.speechSynthesis.resume();
    setEstado("leyendo");
  }, [disponible, usandoNatural]);

  // Remedio al corte de Chrome a los ~15 segundos (ver punto 2 arriba). No
  // aplica a la voz natural, que sale por un elemento de audio común.
  useEffect(() => {
    if (usandoNatural) return;
    if (estado !== "leyendo") return;
    const latido = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(latido);
  }, [estado, usandoNatural]);

  /**
   * Cambiar la velocidad.
   *
   * Con el sintetizador del sistema hay que rearmar la cola: una locución ya
   * encolada no se puede acelerar. La voz natural sale por un elemento de audio
   * común, así que ahí basta con tocarle la velocidad de reproducción — y de
   * paso el cambio es instantáneo y no vuelve a empezar el párrafo.
   */
  const cambiarVelocidad = useCallback(
    (nueva: number) => {
      setVelocidad(nueva);
      if (usandoNatural) {
        obtenerAudio().playbackRate = nueva;
        return;
      }
      // Se rearma desde el párrafo actual, con la velocidad nueva pasada a mano
      // porque el estado todavía no se actualizó en este mismo tick.
      if (estado === "leyendo") comenzar(indice, nueva);
    },
    [estado, indice, comenzar, usandoNatural]
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
      const frase = "Así suena esta voz leyendo un renglón del libro.";
      tandaRef.current++;

      // Con la voz natural la muestra también hay que generarla. Tarda unos
      // segundos la primera vez, que es justamente el dato que conviene
      // conocer antes de elegirla para un libro entero.
      if (vozNaturalId) {
        habilitarAudio();
        const a = obtenerAudio();
        sintetizar(vozNaturalId, frase)
          .then((wav) => {
            const url = URL.createObjectURL(wav);
            a.src = url;
            a.playbackRate = velocidad;
            a.play().catch(() => {});
            a.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
          })
          .catch((err) => {
            console.error(err);
            setErrorNatural("No se pudo generar la muestra con la voz natural.");
          });
        return;
      }

      if (!disponible) return;
      window.speechSynthesis.cancel();

      const v = voiceURI ? voces.find((x) => x.voiceURI === voiceURI) ?? null : vozRef.current;
      const locucion = new SpeechSynthesisUtterance(frase);
      locucion.lang = v?.lang ?? "es-ES";
      if (v) locucion.voice = v;
      locucion.rate = velocidad;
      window.speechSynthesis.speak(locucion);
    },
    [disponible, voces, velocidad, vozNaturalId]
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
    usandoNatural,
    errorNatural,
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
