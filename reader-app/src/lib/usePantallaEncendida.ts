"use client";

import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida mientras se lee.
 *
 * Leer despacio no cuenta como actividad para el teléfono: no hay toques, así
 * que la pantalla se apaga sola a mitad de página. Es una de esas molestias
 * chicas que vuelven incómoda una app entera, y se nota más cuando alguien lee
 * lento porque le cuesta ver.
 *
 * `wakeLock` no existe en todos los navegadores —Safari lo sumó tarde— así que
 * todo está detrás de comprobaciones: donde no está, la app funciona igual y la
 * pantalla se apaga como siempre.
 *
 * El permiso se pierde al cambiar de pestaña o bloquear el teléfono, por eso se
 * vuelve a pedir cuando el documento se hace visible otra vez.
 */
export function usePantallaEncendida(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let permiso: WakeLockSentinel | null = null;
    let cancelado = false;

    const pedir = async () => {
      try {
        permiso = await navigator.wakeLock.request("screen");
      } catch {
        // Puede fallar por batería baja o por política del sistema. No es grave.
      }
    };

    const alVolver = () => {
      if (!cancelado && document.visibilityState === "visible") pedir();
    };

    pedir();
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", alVolver);
      permiso?.release().catch(() => {});
    };
  }, [activo]);
}
