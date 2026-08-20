"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Funcionar sin conexión es una mejora, no un requisito: si el registro
        // falla, la app sigue andando con internet.
      });
    }

    /**
     * Pide que el navegador **no borre** los libros.
     *
     * Los libros viven en IndexedDB, y los navegadores tratan ese espacio como
     * descartable: cuando falta lugar —o, en el iPhone, cuando pasan días sin
     * abrir el sitio— lo limpian sin avisar. Para alguien que cargó su
     * biblioteca una vez, encontrarla vacía es la peor falla posible de esta
     * app.
     *
     * `persist()` marca el almacenamiento como duradero. El navegador puede
     * decir que no, y no hay forma de obligarlo: en iPhone lo que de verdad
     * ayuda es **agregar la app a la pantalla de inicio**, porque las apps
     * instaladas quedan fuera de esa limpieza. Por eso la biblioteca lo sugiere.
     */
    if (navigator.storage?.persist) {
      navigator.storage.persisted?.().then((yaEsDuradero) => {
        if (!yaEsDuradero) navigator.storage.persist().catch(() => {});
      }).catch(() => {});
    }
  }, []);

  return null;
}
