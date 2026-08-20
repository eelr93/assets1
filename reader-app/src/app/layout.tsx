import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Literata, Inter } from "next/font/google";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const accessibleFont = Atkinson_Hyperlegible({
  variable: "--font-accessible",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const readingSerif = Literata({
  variable: "--font-reading-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const systemFont = Inter({
  variable: "--font-system",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lectura Accesible",
  description:
    "Lector de EPUB, PDF y texto con controles de accesibilidad: tamaño de letra, contraste, modo nocturno y enfoque por párrafo.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Lectura",
  },
  // iOS ignora el manifiesto al agregar a la pantalla de inicio y busca este
  // PNG. Sin él pone una captura borrosa de la página en lugar del ícono.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${accessibleFont.variable} ${readingSerif.variable} ${systemFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
