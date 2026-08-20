"use client";

import { useEffect, useState } from "react";

const CLAVE = "accesible-reader:aviso-instalar-visto";

/**
 * Sugiere agregar la app a la pantalla de inicio, en iPhone.
 *
 * **No es un consejo de comodidad: protege los libros.** Los libros viven en
 * el almacenamiento del navegador, y Safari lo limpia cuando pasan días sin
 * abrir el sitio. Las apps agregadas a la pantalla de inicio quedan fuera de esa
 * limpieza. Alguien que cargó su biblioteca una vez y la encuentra vacía dos
 * semanas después no vuelve a confiar en la app, así que este aviso vale la
 * pequeña molestia de aparecer.
 *
 * Solo se muestra donde hace falta: iPhone o iPad, todavía en el navegador. En
 * Android y en escritorio el navegador ofrece instalar por su cuenta, y una vez
 * instalada `display-mode: standalone` es verdadero y el aviso desaparece.
 *
 * Se puede cerrar y no vuelve.
 */
export function AvisoInstalar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(CLAVE) === "1") return;

    const esApple = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const yaInstalada =
      window.matchMedia("(display-mode: standalone)").matches ||
      // Safari usa esta propiedad propia en vez del display-mode estándar.
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Solo se puede saber después de montar: durante el prerender no hay
    // navegador que interrogar. Mismo caso que en SettingsContext.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (esApple && !yaInstalada) setVisible(true);
  }, []);

  if (!visible) return null;

  const cerrar = () => {
    localStorage.setItem(CLAVE, "1");
    setVisible(false);
  };

  return (
    <aside className="flex items-start gap-3 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/8 px-4 py-3.5">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5 shrink-0 text-[var(--accent)]"
        aria-hidden
      >
        <path d="M12 16V4M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
      </svg>

      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <p className="font-semibold">Agregala a la pantalla de inicio</p>
        <p className="mt-0.5 text-[var(--foreground)]/70">
          Tocá <strong>Compartir</strong> y después <strong>Agregar a pantalla de inicio</strong>.
          Además de abrirse como una app, es lo que evita que el iPhone borre tus libros si pasás
          unos días sin leer.
        </p>
      </div>

      <button
        onClick={cerrar}
        aria-label="No mostrar este aviso otra vez"
        className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--foreground)]/50 transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  );
}
