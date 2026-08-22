import type { NextConfig } from "next";

/**
 * DOS FORMAS DE PUBLICAR LA MISMA APP
 * ===================================
 *
 * `npm run build`         → app completa. Necesita un hosting que corra Node
 *                           (Vercel), porque la ruta /api/quiz vive en el
 *                           servidor: verifica la sesión y guarda la clave de
 *                           IA, que nunca puede viajar al navegador.
 *
 * `npm run build:lector`  → sitio estático puro, sin servidor. Es el lector
 *                           entero —abrir EPUB/PDF/TXT, ajustes, modo enfoque,
 *                           progreso— porque todo eso ocurre en el teléfono:
 *                           los libros se guardan en IndexedDB y no salen de
 *                           ahí. Se sube a Cloudflare Pages y no cuesta nada.
 *
 * El código es el mismo en los dos casos. Lo que cambia es si hay servidor y si
 * hay claves; la app se adapta sola (ver AuthGate).
 */
const soloLector = process.env.LECTOR_ESTATICO === "1";

const nextConfig: NextConfig = {
  /*
    Acá no hay nada del motor de voz neuronal a propósito: ese paquete ya no
    entra en el empaquetado de Next. El hilo que lo usa se arma aparte con
    esbuild (`scripts/construir-worker-voz.mjs`) y queda como un archivo suelto
    en `public/`. Ver ese script para el motivo.
  */
  ...(soloLector
    ? {
        output: "export" as const,
        // Cloudflare Pages sirve /ruta/index.html; sin esto los enlaces
        // internos quedarían apuntando a archivos que no existen.
        trailingSlash: true,
        // El optimizador de imágenes necesita servidor. Acá no hay.
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
