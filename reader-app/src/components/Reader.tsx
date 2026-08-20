"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getBook, getBookFile, getMarcadores, getProgress, saveProgress, setMarcadores as guardarMarcadores } from "@/lib/db";
import { parseBook } from "@/lib/parsers";
import { marcarTermino, paragraphsToPlainText, paragraphsToSpeakableText } from "@/lib/text";
import type { Marcador, ParsedBook, StoredBook } from "@/lib/types";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { useVozAlta } from "@/lib/useVozAlta";
import { usePantallaEncendida } from "@/lib/usePantallaEncendida";
import { useDesplazamientoAuto, VELOCIDADES_SCROLL } from "@/lib/useDesplazamientoAuto";
import { SettingsPanel } from "@/components/SettingsPanel";
import { BarraVoz } from "@/components/BarraVoz";
import { PanelIndice } from "@/components/PanelIndice";
import { Quiz } from "@/components/Quiz";

const FONT_FAMILY: Record<string, string> = {
  accessible: "var(--font-accessible)",
  "reading-serif": "var(--font-reading-serif)",
  system: "var(--font-system), system-ui, sans-serif",
};

export function Reader({ bookId, onBack }: { bookId: string; onBack: () => void }) {
  const { settings, update } = useSettings();
  const { configured: quizDisponible } = useAuth();
  const [book, setBook] = useState<StoredBook | null>(null);
  const [parsed, setParsed] = useState<ParsedBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [indiceOpen, setIndiceOpen] = useState(false);
  const [marcadores, setMarcadores] = useState<Marcador[]>([]);

  /**
   * Lo último que se buscó, atado al capítulo donde se saltó.
   *
   * Guardar el capítulo adentro evita tener que limpiar el término cada vez que
   * se cambia de capítulo: si no coincide, no se marca nada. Al volver a ese
   * capítulo el resaltado sigue ahí, que es lo que se espera cuando se está
   * yendo y viniendo entre dos pasajes.
   */
  const [busqueda, setBusqueda] = useState<{ termino: string; chapterIndex: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);
  const restoredRef = useRef(false);
  const pendingScrollTarget = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getBook(bookId);
        const blob = await getBookFile(bookId);
        if (!stored || !blob) throw new Error("No se encontró el libro");
        const file = new File([blob], stored.fileName, { type: blob.type });
        const parsedBook = await parseBook(file, stored.format);
        if (cancelled) return;
        setBook(stored);
        setParsed(parsedBook);

        const progress = await getProgress(bookId);
        if (progress) {
          setChapterIndex(Math.min(progress.chapterIndex, parsedBook.chapters.length - 1));
          pendingScrollTarget.current = progress.paragraphIndex;
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("No se pudo abrir este libro. El archivo puede estar dañado.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const totalChapters = parsed?.chapters.length ?? 0;
  const chapter = parsed?.chapters[chapterIndex];
  const chapterText = useMemo(
    () => (chapter ? paragraphsToPlainText(chapter.paragraphs) : ""),
    [chapter]
  );

  /**
   * El HTML de cada párrafo, con lo buscado marcado si corresponde.
   *
   * Se marca el capítulo entero y no solo el párrafo al que se saltó: la
   * palabra suele aparecer varias veces cerca, y ver las otras es lo que
   * permite darse cuenta de si el pasaje es el que se estaba buscando.
   *
   * Va memorizado porque son unas cuantas expresiones regulares sobre todo el
   * capítulo; sin esto se recalcularían en cada render, incluso al mover el
   * resaltado de la voz de un párrafo al siguiente.
   */
  const parrafosHtml = useMemo(() => {
    const parrafos = chapter?.paragraphs ?? [];
    const termino = busqueda?.chapterIndex === chapterIndex ? busqueda.termino : null;
    if (!termino) return parrafos.map((p) => p.html);
    return parrafos.map((p) => (p.kind === "image" ? p.html : marcarTermino(p.html, termino)));
  }, [chapter, busqueda, chapterIndex]);

  // ── Lectura en voz alta ───────────────────────────────────────────────────
  const textosParaVoz = useMemo(
    () => (chapter ? paragraphsToSpeakableText(chapter.paragraphs) : []),
    [chapter]
  );

  /**
   * Marca que la voz debe seguir sola en el capítulo que se está por cargar.
   *
   * Hace falta distinguir dos motivos para cambiar de capítulo: si lo cambió
   * ella, la voz tiene que callarse; si lo terminó la voz, tiene que seguir.
   * Sin esta marca los dos casos se ven iguales desde el efecto que reacciona
   * al cambio.
   */
  const seguirEnElSiguiente = useRef(false);

  const voz = useVozAlta({
    parrafos: textosParaVoz,
    // Mientras habla, el párrafo activo lo manda la voz y no el desplazamiento:
    // así el resaltado del modo enfoque acompaña a lo que se está escuchando.
    onParrafo: (i) => {
      setActiveIndex(i);
      paragraphRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    // Terminado un capítulo, sigue con el próximo sin que haya que tocar nada.
    // Es lo que convierte "leer un capítulo en voz alta" en escuchar el libro:
    // se puede dejar andando y descansar los ojos un rato largo.
    onFinDelCapitulo: () => {
      if (chapterIndex >= totalChapters - 1) return;
      seguirEnElSiguiente.current = true;
      setChapterIndex(chapterIndex + 1);
      setActiveIndex(0);
    },
  });

  const leyendo = voz.estado !== "detenido";
  // `voz` es un objeto nuevo en cada render; la función de adentro no. Se saca
  // acá para poder ponerla como dependencia sin invalidar medio componente.
  const comenzarVoz = voz.comenzar;

  // El efecto del desplazamiento se registra una vez por capítulo y necesita
  // saber si la voz está andando. Va por ref y no por dependencia a propósito:
  // agregarlo a las dependencias volvería a montar el efecto en cada play y
  // pausa, y eso reinicia la posición de lectura.
  const leyendoRef = useRef(false);
  useEffect(() => {
    leyendoRef.current = leyendo;
  }, [leyendo]);

  // Ídem para el modo enfoque: el efecto necesita saberlo sin volver a montarse.
  const enfoqueRef = useRef(false);
  useEffect(() => {
    enfoqueRef.current = settings.focusMode;
  }, [settings.focusMode]);


  // Con la voz andando la pantalla no se apaga; leyendo con los ojos tampoco,
  // porque pasar de párrafo no cuenta como actividad para el sistema.
  usePantallaEncendida(true);

  /**
   * Qué hace la voz al cambiar de capítulo.
   *
   * Si el cambio lo pidió ella, la voz se calla: seguir leyendo un texto que ya
   * no está en pantalla desorienta. Si el cambio lo provocó la propia voz al
   * terminar, arranca sola desde el principio del capítulo nuevo.
   *
   * `textosParaVoz` está en las dependencias porque en el primer render del
   * capítulo nuevo todavía puede venir vacío: hay que esperar a que el texto
   * exista para poder encolarlo.
   */
  useEffect(() => {
    if (seguirEnElSiguiente.current) {
      if (textosParaVoz.length === 0) return;
      seguirEnElSiguiente.current = false;
      voz.comenzar(0);
      return;
    }
    voz.detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, bookId, textosParaVoz]);

  /**
   * Hasta cuándo ignorar el desplazamiento al elegir el párrafo activo.
   *
   * Saltar a un párrafo dispara un scroll suave, y ese scroll haría que el
   * cálculo por posición eligiera otro párrafo a mitad del recorrido. La
   * ventana corta deja terminar la animación antes de devolverle el mando.
   */
  const saltoManualHasta = useRef(0);

  const persist = useCallback(
    (idx: number) => {
      if (!parsed) return;
      const totalInChapter = chapter?.paragraphs.length || 1;
      const fraction =
        totalChapters > 0
          ? (chapterIndex + Math.min(1, idx / totalInChapter)) / totalChapters
          : 0;
      saveProgress({
        bookId,
        chapterIndex,
        paragraphIndex: idx,
        fraction,
        updatedAt: Date.now(),
      });
    },
    [bookId, chapter, chapterIndex, parsed, totalChapters]
  );

  /**
   * Qué pasa al tocar un párrafo.
   *
   * Depende de si la voz está andando, y las dos cosas son la misma idea: se
   * toca lo que se quiere leer.
   *
   * - **Con la voz andando, lee desde ahí.** Es la forma de volver atrás cuando
   *   se distrajo tres párrafos, o de saltear un pasaje. Antes no había ninguna:
   *   había que detener, desplazar hasta el lugar y volver a empezar, y como el
   *   párrafo de arranque lo elegía el desplazamiento, dar en el correcto era
   *   cuestión de suerte.
   * - **Con la voz callada y el modo enfoque encendido, mueve el resaltado.** Es
   *   la interacción central del modo enfoque, y de paso deja elegido desde
   *   dónde va a arrancar "Escuchar".
   *
   * Con la voz callada y sin modo enfoque no hace nada: ahí un toque no
   * significa nada, y hacer que empiece a hablar de golpe sería alarmante.
   *
   * En ningún caso hace algo si hay texto seleccionado — soltar el dedo después
   * de marcar una frase también dispara un clic, y eso perdería la selección.
   */
  const alTocarParrafo = useCallback(
    (i: number) => {
      if (!window.getSelection()?.isCollapsed) return;

      if (leyendo) {
        // El toque es el gesto del usuario que Safari exige para poder hablar,
        // así que se puede encolar acá mismo sin que iOS lo rechace.
        saltoManualHasta.current = Date.now() + 700;
        setActiveIndex(i);
        persist(i);
        comenzarVoz(i);
        return;
      }

      if (!settings.focusMode) return;
      setActiveIndex(i);
      persist(i);
    },
    [leyendo, settings.focusMode, persist, comenzarVoz]
  );

  /**
   * Mueve el foco un párrafo, sin obligar a apuntar con el dedo.
   *
   * En modo enfoque el párrafo resaltado es el que se está leyendo, y hasta
   * ahora la única forma de avanzar era desplazar la pantalla con precisión.
   * Para alguien que no ve bien, eso es justo lo difícil: tocar una zona ancha
   * es mucho más fácil que dejar el texto a la altura exacta.
   */
  const moverFoco = useCallback(
    (delta: number) => {
      const total = chapter?.paragraphs.length ?? 0;
      if (total === 0) return;

      // Se saltean los párrafos vacíos y las imágenes: parar en una imagen sin
      // texto haría sentir que el botón no hizo nada.
      let destino = activeIndex + delta;
      while (destino > 0 && destino < total - 1) {
        const p = chapter?.paragraphs[destino];
        if (p && p.kind !== "image" && p.html.replace(/<[^>]*>/g, "").trim()) break;
        destino += delta;
      }
      destino = Math.max(0, Math.min(total - 1, destino));
      if (destino === activeIndex) return;

      saltoManualHasta.current = Date.now() + 700;
      setActiveIndex(destino);
      paragraphRefs.current[destino]?.scrollIntoView({ behavior: "smooth", block: "center" });
      persist(destino);
    },
    [activeIndex, chapter, persist]
  );

  // Scroll tracking: drives both the paragraph-focus highlight and progress saving.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !chapter) return;

    let ticking = false;
    let saveTimer: ReturnType<typeof setTimeout>;
    let lastIndex = 0;

    const computeActive = () => {
      ticking = false;

      const containerRect = container.getBoundingClientRect();
      const band = containerRect.top + containerRect.height * 0.3;
      let idx = 0;
      for (let i = 0; i < paragraphRefs.current.length; i++) {
        const el = paragraphRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        idx = i;
        if (rect.bottom >= band) break;
      }

      // El avance de lectura siempre sigue al desplazamiento: aunque el
      // resaltado no se mueva, si ella bajó por el capítulo y cierra el libro,
      // tiene que volver donde estaba mirando.
      lastIndex = idx;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => persist(idx), 700);

      // El resaltado, en cambio, no lo mueve el desplazamiento cuando el modo
      // enfoque está encendido: ahí lo elige ella tocando el párrafo. Que se
      // moviera solo era justamente el problema — se peleaba con el toque y el
      // párrafo marcado terminaba siendo otro.
      if (enfoqueRef.current) return;
      // Con la voz andando manda ella, por el mismo motivo.
      if (leyendoRef.current) return;
      // Y tampoco pisa un salto recién pedido, mientras dura su animación.
      if (Date.now() < saltoManualHasta.current) return;

      setActiveIndex(idx);
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(computeActive);
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    if (!restoredRef.current) {
      restoredRef.current = true;
      const target = pendingScrollTarget.current;
      if (target) {
        requestAnimationFrame(() => {
          paragraphRefs.current[target]?.scrollIntoView({ block: "start" });
        });
      }
    } else {
      container.scrollTop = 0;
    }
    computeActive();

    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(saveTimer);
      // Flush immediately on chapter change / unmount so a quick exit never loses position.
      persist(lastIndex);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, chapterIndex]);

  // ── Desplazamiento automático ─────────────────────────────────────────────

  const desplazamiento = useDesplazamientoAuto({
    contenedor: scrollRef,
    renglonesPorMinuto: settings.autoScrollRenglones,
    // El alto real de un renglón, para que la velocidad se sienta igual con
    // letra chica y con letra grande.
    altoDeRenglon: settings.fontSize * settings.lineHeight,
    clave: chapterIndex,
    hayMas: chapterIndex < totalChapters - 1,
    // Al llegar al fondo sigue con el capítulo siguiente, igual que la voz. Si
    // hubiera que tocar algo en cada final se pierde la mitad de la ventaja:
    // lo que se busca es no despegar la vista del renglón.
    onFinal: () => {
      setChapterIndex(chapterIndex + 1);
      setActiveIndex(0);
    },
  });

  const detenerDesplazamiento = desplazamiento.detener;

  /**
   * En qué escalón de velocidad está, para poder subir y bajar de a uno.
   *
   * Lo guardado es la velocidad en renglones, no el escalón: si mañana cambia
   * la tabla, un índice guardado apuntaría a otra cosa. Si el valor guardado no
   * está en la tabla se cae al más cercano.
   */
  const nivelScroll = useMemo(() => {
    let mejor = 0;
    VELOCIDADES_SCROLL.forEach((v, i) => {
      const dif = Math.abs(v.renglones - settings.autoScrollRenglones);
      if (dif < Math.abs(VELOCIDADES_SCROLL[mejor].renglones - settings.autoScrollRenglones)) mejor = i;
    });
    return mejor;
  }, [settings.autoScrollRenglones]);

  const cambiarNivelScroll = (delta: number) => {
    const destino = Math.max(0, Math.min(VELOCIDADES_SCROLL.length - 1, nivelScroll + delta));
    update({ autoScrollRenglones: VELOCIDADES_SCROLL[destino].renglones });
  };

  // La voz también desplaza, párrafo por párrafo. Las dos cosas a la vez se
  // pelean: el desplazamiento parejo arrastra el texto mientras el salto de la
  // voz trata de centrar el párrafo, y queda temblando. Manda la voz.
  useEffect(() => {
    if (leyendo) detenerDesplazamiento();
  }, [leyendo, detenerDesplazamiento]);

  const goToChapter = (idx: number) => {
    if (!parsed) return;
    const clamped = Math.max(0, Math.min(parsed.chapters.length - 1, idx));
    if (clamped === chapterIndex) return;
    setChapterIndex(clamped);
    setActiveIndex(0);
  };

  // ── Marcadores ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelado = false;
    getMarcadores(bookId).then((lista) => {
      if (!cancelado) setMarcadores(lista);
    });
    return () => {
      cancelado = true;
    };
  }, [bookId]);

  const marcadoActual = marcadores.some(
    (m) => m.chapterIndex === chapterIndex && m.paragraphIndex === activeIndex
  );

  const alternarMarcador = useCallback(() => {
    if (!chapter) return;

    const yaEsta = marcadores.find(
      (m) => m.chapterIndex === chapterIndex && m.paragraphIndex === activeIndex
    );

    const siguiente = yaEsta
      ? marcadores.filter((m) => m.creadoEn !== yaEsta.creadoEn)
      : [
          {
            chapterIndex,
            paragraphIndex: activeIndex,
            chapterTitle: chapter.title,
            // Un pedazo del texto para poder reconocer el punto en la lista.
            fragmento:
              (chapter.paragraphs[activeIndex]?.html ?? "")
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 140) || "(sin texto)",
            creadoEn: Date.now(),
          },
          ...marcadores,
        ];

    setMarcadores(siguiente);
    guardarMarcadores(bookId, siguiente);
  }, [bookId, chapter, chapterIndex, activeIndex, marcadores]);

  /** Saltar a un punto concreto, desde el índice, un marcador o una búsqueda. */
  const irA = useCallback(
    (ci: number, pi?: number, termino?: string) => {
      setIndiceOpen(false);
      if (ci !== chapterIndex) setChapterIndex(ci);

      // Se guarda junto con el capítulo en lugar de limpiarse a mano en cada
      // lugar que cambia de capítulo — que son cinco, y olvidarse de uno deja
      // el resaltado azul pegado en un capítulo que no se buscó.
      setBusqueda(termino ? { termino, chapterIndex: ci } : null);

      if (pi === undefined) {
        setActiveIndex(0);
        return;
      }

      saltoManualHasta.current = Date.now() + 900;
      setActiveIndex(pi);
      // Al cambiar de capítulo los párrafos todavía no están montados: hay que
      // esperar al render siguiente para poder desplazarse hasta el destino.
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          paragraphRefs.current[pi]?.scrollIntoView({ block: "center" })
        )
      );
    },
    [chapterIndex]
  );

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-lg font-medium">{error}</p>
        <button onClick={onBack} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">
          Volver a la biblioteca
        </button>
      </div>
    );
  }

  if (!parsed || !book || !chapter) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-[var(--foreground)]/60">Abriendo libro…</p>
      </div>
    );
  }

  return (
    <div className={`theme-${settings.theme} flex flex-1 flex-col`} style={{ background: "var(--read-bg)", color: "var(--read-fg)" }}>
      <header
        className="sticky top-0 z-10 flex items-center gap-2 border-b px-3 py-2"
        style={{ background: "var(--read-bg)", borderColor: "color-mix(in srgb, var(--read-fg) 15%, transparent)" }}
      >
        <button
          onClick={onBack}
          aria-label="Volver a la biblioteca"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/*
          El título del capítulo, tocable, abre el índice. Antes acá había un
          desplegable con todos los capítulos: en un libro largo es una lista
          diminuta dentro de un control diminuto, y además se comía el espacio
          de los botones de letra.
        */}
        <button
          onClick={() => setIndiceOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-2 text-left transition hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
        >
          <span className="min-w-0 flex-1 truncate text-sm">{chapter.title}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-60" aria-hidden>
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={alternarMarcador}
          aria-label={marcadoActual ? "Quitar el marcador de este punto" : "Guardar un marcador acá"}
          aria-pressed={marcadoActual}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={marcadoActual ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
          </svg>
        </button>

        {/*
          Agrandar y achicar la letra sin salir del texto. Estaba solo dentro
          del panel de ajustes, o sea tres toques: abrir, cambiar, cerrar. Es lo
          que más se toca cuando la vista se cansa a mitad de página, así que
          tiene que estar a un toque.
        */}
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => update({ fontSize: Math.max(14, settings.fontSize - 2) })}
            disabled={settings.fontSize <= 14}
            aria-label="Achicar la letra"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold disabled:opacity-25 enabled:hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
          >
            A−
          </button>
          <button
            onClick={() => update({ fontSize: Math.min(48, settings.fontSize + 2) })}
            disabled={settings.fontSize >= 48}
            aria-label="Agrandar la letra"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[19px] font-bold disabled:opacity-25 enabled:hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
          >
            A+
          </button>
        </div>

        <button
          onClick={() => setPanelOpen(true)}
          aria-label="Ajustes de lectura"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,var(--read-fg)_10%,transparent)]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z" />
          </svg>
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="mx-auto px-4 py-8"
          style={{
            maxWidth: settings.contentWidth,
            fontFamily: FONT_FAMILY[settings.font],
            fontSize: settings.fontSize,
            lineHeight: settings.lineHeight,
            letterSpacing: `${settings.letterSpacing}em`,
            wordSpacing: `${settings.wordSpacing}em`,
            textAlign: settings.textAlign,
          }}
        >
          {/*
            El resaltado se pinta con el modo enfoque encendido **o mientras la
            voz está leyendo**. Antes dependía solo del modo enfoque, que viene
            apagado de fábrica: al tocar "Escuchar" la voz avanzaba de párrafo
            pero no se veía nada, y seguir la lectura con la vista era imposible
            — que es justamente para lo que sirve.

            El atenuado del resto sigue atado al modo enfoque nada más. Apagar
            media pantalla sin que nadie lo haya pedido es un cambio brusco;
            marcar dónde va la voz, no.
          */}
          {chapter.paragraphs.map((p, i) => {
            const isActive = i === activeIndex;
            const resaltar = isActive && (settings.focusMode || leyendo);
            const dim = settings.focusMode && !isActive;
            if (p.kind === "image") {
              return (
                <div
                  key={i}
                  ref={(el) => {
                    paragraphRefs.current[i] = el;
                  }}
                  className="reader-paragraph my-4 flex justify-center"
                  style={{ opacity: dim ? 1 - settings.focusDimOpacity : 1 }}
                  dangerouslySetInnerHTML={{ __html: parrafosHtml[i] }}
                />
              );
            }
            const Tag = p.kind === "heading" ? (`h${p.level ?? 2}` as const) : "p";
            // El toque hace algo distinto según el estado, así que también se
            // ofrece distinto: sin nada que hacer no se muestra como tocable.
            const tocable = leyendo || settings.focusMode;
            return (
              <Tag
                key={i}
                ref={(el: HTMLElement | null) => {
                  paragraphRefs.current[i] = el as HTMLDivElement | null;
                }}
                // Con la voz andando, lee desde acá. Con la voz callada y el
                // modo enfoque encendido, mueve el resaltado. Es la misma idea
                // en los dos casos: se toca lo que se quiere leer.
                onClick={tocable ? () => alTocarParrafo(i) : undefined}
                className={`reader-paragraph rounded-md ${p.kind === "heading" ? "mb-4 mt-8 font-bold" : "mb-4"} ${
                  tocable ? "cursor-pointer" : ""
                } ${resaltar ? "reader-paragraph--activo" : ""}`}
                style={{
                  background: resaltar ? "var(--read-paragraph-bg-active)" : "transparent",
                  opacity: dim ? 1 - settings.focusDimOpacity : 1,
                  // Sin esto, iOS espera 300 ms por si el toque es un doble
                  // toque para hacer zoom, y la respuesta llega tarde.
                  touchAction: tocable ? "manipulation" : undefined,
                }}
                dangerouslySetInnerHTML={{ __html: parrafosHtml[i] }}
              />
            );
          })}

          {/*
            El quiz llama a un servidor propio que verifica la sesión y consume
            tokens pagos. Sin cuentas configuradas no hay a quién verificar ni
            con qué pagar, así que el botón no se muestra: es preferible que no
            exista a que exista y falle.
          */}
          {quizDisponible && (
            <Quiz
              key={chapterIndex}
              bookTitle={book.title}
              chapterTitle={chapter.title}
              chapterText={chapterText}
            />
          )}

          {/*
            Botones anchos y apilados en el teléfono. Antes eran tres cosas en
            una fila: en una pantalla angosta quedaban tan finitos que había que
            apuntar, que es justo lo que no se le puede pedir a esta usuaria.
          */}
          <nav
            className="mt-12 mb-24 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "color-mix(in srgb, var(--read-fg) 15%, transparent)" }}
          >
            <button
              onClick={() => goToChapter(chapterIndex - 1)}
              disabled={chapterIndex === 0}
              className="min-h-12 rounded-xl border px-5 py-3 font-medium transition disabled:opacity-25 enabled:hover:bg-[color-mix(in_srgb,var(--read-fg)_8%,transparent)]"
              style={{ borderColor: "color-mix(in srgb, var(--read-fg) 25%, transparent)", fontSize: "0.95rem" }}
            >
              ← Capítulo anterior
            </button>
            <span className="order-first text-center text-sm opacity-60 sm:order-none">
              Capítulo {chapterIndex + 1} de {totalChapters}
            </span>
            <button
              onClick={() => goToChapter(chapterIndex + 1)}
              disabled={chapterIndex === totalChapters - 1}
              className="min-h-12 rounded-xl border px-5 py-3 font-medium transition disabled:opacity-25 enabled:hover:bg-[color-mix(in_srgb,var(--read-fg)_8%,transparent)]"
              style={{ borderColor: "color-mix(in srgb, var(--read-fg) 25%, transparent)", fontSize: "0.95rem" }}
            >
              Capítulo siguiente →
            </button>
          </nav>
        </div>
      </div>

      {/*
        La barra se muestra aunque no haya voz: el desplazamiento automático no
        depende del sintetizador, y en un navegador sin voces era lo único que
        quedaba sin ningún control en pantalla.
      */}
      <BarraVoz
          vozDisponible={voz.disponible}
          estado={voz.estado}
          velocidad={voz.velocidad}
          velocidades={voz.velocidades}
          onLeer={() => voz.comenzar(activeIndex)}
          onPausar={voz.pausar}
          onReanudar={voz.reanudar}
          onDetener={voz.detener}
          onVelocidad={voz.cambiarVelocidad}
          voces={voz.voces}
          vozElegida={voz.vozElegida}
          onVoz={voz.cambiarVoz}
          minutosTemporizador={voz.minutosTemporizador}
          minutosRestantes={voz.minutosRestantes}
          onTemporizador={voz.programarTemporizador}
          // Las flechas de párrafo solo tienen sentido con el resaltado
          // encendido: sin modo enfoque no hay nada que mover.
          navegacionFoco={
            settings.focusMode
              ? { anterior: () => moverFoco(-1), siguiente: () => moverFoco(1) }
              : undefined
          }
          desplazamiento={{
            activo: desplazamiento.activo,
            etiqueta: VELOCIDADES_SCROLL[nivelScroll].etiqueta,
            onAlternar: desplazamiento.alternar,
            onMasLento: () => cambiarNivelScroll(-1),
            onMasRapido: () => cambiarNivelScroll(1),
            puedeMasLento: nivelScroll > 0,
            puedeMasRapido: nivelScroll < VELOCIDADES_SCROLL.length - 1,
          }}
        />

      {indiceOpen && (
        <PanelIndice
          libro={parsed}
          capituloActual={chapterIndex}
          marcadores={marcadores}
          onIr={irA}
          onBorrarMarcador={(creadoEn) => {
            const siguiente = marcadores.filter((m) => m.creadoEn !== creadoEn);
            setMarcadores(siguiente);
            guardarMarcadores(bookId, siguiente);
          }}
          onCerrar={() => setIndiceOpen(false)}
        />
      )}

      {panelOpen && <SettingsPanel onClose={() => setPanelOpen(false)} />}
    </div>
  );
}
