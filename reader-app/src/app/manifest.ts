import type { MetadataRoute } from "next";

// El manifiesto no depende de nada del pedido: es el mismo archivo siempre.
// Declararlo estático es lo que permite exportar la app como sitio sin servidor.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lectura Accesible",
    short_name: "Lectura",
    description:
      "Lector de EPUB, PDF y texto con controles de accesibilidad: tamaño de letra, contraste, modo nocturno y enfoque por párrafo.",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfdfb",
    theme_color: "#2b6cb0",
    lang: "es",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      // Android quiere PNG de tamaños concretos para la pantalla de inicio.
      // "maskable" es el que se recorta al contorno del sistema (círculo,
      // cuadrado redondeado); sin él, algunos launchers meten el ícono dentro
      // de un cuadrado blanco.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
