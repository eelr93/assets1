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
    El modelo de voz neuronal viene compilado con Emscripten, y ese código trae
    adentro las dos variantes: la del navegador y la de Node. La de Node hace
    `require("fs")` detrás de un `if (typeof process === "object")` que en el
    navegador nunca se cumple — pero el empaquetador no ejecuta ese `if`, ve el
    `require` y falla porque `fs` no existe del lado del cliente.

    Apuntar `fs` y `path` a un módulo vacío deja que el empaquetado termine. La
    rama que los usaría no corre nunca en un navegador, así que no se pierde
    nada.
  */
  turbopack: {
    resolveAlias: {
      fs: "./src/lib/moduloVacio.ts",
      path: "./src/lib/moduloVacio.ts",
    },
  },
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    return config;
  },
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
