# Lectura Accesible — documento de traspaso

Este documento resume todo lo construido hasta ahora para retomar el trabajo
desde otra sesión de Claude Code (por ejemplo, en tu computadora).

## Cómo continuar (importante, leer primero)

El código completo **ya está en GitHub**, no hace falta reescribirlo ni
pegarlo en ningún lado. Lo más simple es que en tu PC clones el repositorio
y le pidas a Claude Code que siga desde ahí:

```
git clone https://github.com/eelr93/assets1.git
cd assets1
git checkout claude/accessible-reading-app-icddv1
cd reader-app
```

Abrí Claude Code en esa carpeta (`reader-app/`) y contale que continúe desde
acá — va a encontrar este mismo archivo, el `SETUP.md` y todo el código.
Si no tenés `git` instalado o nunca lo usaste, avisale a Claude Code y que
te guíe paso a paso para instalarlo y clonar.

Este archivo (`HANDOFF.md`) es un resumen para dar contexto rápido; el
código real y la documentación operativa detallada están en el repo.

## Qué es esta app

Lector de EPUB, PDF y TXT pensado originalmente para mi novia, que fue
operada de cataratas en ambos ojos y tiene dificultad para leer. Permite
ajustar tamaño de letra, tipografía, espaciados, fondo/tema (incluye modo
nocturno y alto contraste) y tiene un "modo enfoque" que resalta el párrafo
que se está leyendo y atenúa el resto.

El proyecto evolucionó a algo más grande: se va a publicar en Play Store
(el dueño ya tiene cuenta de desarrollador paga), así que ahora es
multiusuario con registro moderado (para controlar quién puede generar
quizzes con IA, ya que eso consume tokens pagos).

## Stack técnico

- **Next.js 16** (App Router, TypeScript, Tailwind v4), en `reader-app/`.
- **Lectura**: parsers propios de EPUB (JSZip + DOMParser), PDF (pdfjs-dist)
  y TXT, todos normalizados a un modelo común de capítulos/párrafos.
  HTML extraído sanitizado con DOMPurify antes de renderizarlo.
- **Almacenamiento de libros**: 100% local por dispositivo, vía IndexedDB
  (`idb-keyval`). Los libros de cada usuario nunca salen de su teléfono.
- **Cuentas**: Supabase (auth + Postgres). Todo registro nuevo queda en
  estado `pending` hasta que un administrador lo aprueba desde un panel
  dentro de la misma app.
- **Quiz de comprensión**: ruta de servidor `/api/quiz` que verifica la
  sesión de Supabase y que el usuario esté aprobado, y recién ahí llama a
  la API de Anthropic (modelo Haiku por defecto, por costo) para generar
  3-4 preguntas de opción múltiple basadas en el texto del capítulo.
- **PWA**: manifest + service worker propios (sin `next-pwa`, porque no es
  compatible con Next 16) para que sea instalable en Android desde Chrome.
- Pensado para empaquetarse en Play Store más adelante con **Bubblewrap**
  (PWA → Android App Bundle), una vez que esté desplegada en un dominio real.

## Decisiones importantes a recordar

- **pdfjs-dist está fijado en la versión 4.9.155**, no subir a la 6.x: las
  versiones más nuevas usan `Map.prototype.getOrInsertComputed`, una API muy
  reciente que todavía no soportan navegadores/WebViews comunes.
- El worker de pdf.js (`public/pdf.worker.min.mjs`) **no se versiona en git**:
  se copia automáticamente desde `node_modules` al hacer `npm install`, vía
  el script `postinstall` (`scripts/copy-pdf-worker.mjs`).
- Next 16 renombró `middleware.js` a `proxy.js` — no se usa ninguno de los
  dos en este proyecto: la protección de rutas se hace toda del lado
  cliente (`AuthGate`) más la verificación de sesión dentro de la propia
  ruta `/api/quiz` (que es el único endpoint sensible).
- Cada tienda de IndexedDB necesita su **propia base de datos** en
  `idb-keyval` (`createStore`); si comparten nombre de base, solo se crea el
  primer store. Por eso `src/lib/db.ts` usa tres bases separadas.
- La aprobación de administrador usa una función `security definer`
  (`is_admin()`) en la base para evitar recursión infinita en las políticas
  RLS de Supabase — ver `supabase/migration.sql`.

## Estado actual de la puesta en marcha (Supabase)

- Proyecto de Supabase creado: `https://etsakkscgjolgtetxzxm.supabase.co`.
- `supabase/migration.sql` se está corriendo desde el SQL Editor del panel
  de Supabase (paso en curso al momento de escribir esto — confirmar que
  haya dado "Success" antes de seguir).

### Pendiente para dejarla 100% funcional

1. Confirmar que la migración SQL corrió sin errores.
2. Copiar la `anon public key` desde *Project Settings > API* en Supabase.
3. Conseguir una API key en console.anthropic.com (cuenta distinta a
   claude.ai) y cargarle saldo.
4. Crear `reader-app/.env.local` a partir de `.env.local.example` con esos
   tres valores (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ANTHROPIC_API_KEY`).
5. Correr `npm install && npm run dev`, registrarse desde la app con el
   propio correo, y promoverse a administrador con:
   ```sql
   update public.profiles set is_admin = true, status = 'approved'
   where email = 'tu-email@ejemplo.com';
   ```
6. Desplegar en un hosting real (Vercel recomendado) con esas mismas
   variables de entorno cargadas ahí también.
7. Empaquetar con Bubblewrap para subir a Play Store (guía resumida en
   `SETUP.md`, sección 7).

El detalle paso a paso de todo esto ya está escrito en `reader-app/SETUP.md`.

## Estructura del código

```
reader-app/
  src/
    app/
      layout.tsx        # fuentes, AuthProvider/SettingsProvider, manifest
      page.tsx           # renderiza <AppShell/>
      manifest.ts         # manifest de PWA
      api/quiz/route.ts    # genera el quiz (server-side, verifica sesión)
    components/
      AppShell.tsx         # switch biblioteca/lector/admin + barra superior
      AuthGate.tsx          # decide: login / pendiente / app según sesión
      AuthForm.tsx           # formulario de login y registro
      PendingApproval.tsx     # pantalla de "cuenta pendiente"
      AdminPanel.tsx           # aprobar/rechazar usuarios
      Library.tsx               # biblioteca: subir/listar/borrar libros
      BookCard.tsx
      Reader.tsx                 # lector: temas, tipografía, modo enfoque,
                                  #   progreso, navegación de capítulos
      SettingsPanel.tsx            # panel de ajustes de lectura
      Quiz.tsx                      # quiz al final de cada capítulo
      ServiceWorkerRegister.tsx
    context/
      AuthContext.tsx      # sesión + perfil de Supabase
      SettingsContext.tsx   # ajustes de lectura (persistidos en localStorage)
    lib/
      types.ts               # tipos compartidos
      db.ts                    # IndexedDB (libros, archivos, progreso)
      sanitize.ts                # DOMPurify
      text.ts                     # HTML de párrafos -> texto plano (para el quiz)
      parsers/                     # epub.ts, pdf.ts, txt.ts, index.ts
      supabase/
        client.ts                   # cliente de navegador
        server.ts                    # cliente de servidor (Route Handlers)
  supabase/migration.sql   # esquema + políticas RLS (correr una vez)
  public/sw.js               # service worker
  SETUP.md                    # guía paso a paso de puesta en marcha
  .env.local.example           # variables de entorno necesarias
```

## Qué falta construir (funcionalidad)

- Nada crítico del lado del código para el MVP + cuentas + quiz: está todo
  implementado, compilado y probado en el navegador (sin credenciales reales
  de Supabase/Anthropic, porque esta sesión no tenía acceso a ellas).
- Falta **probar el flujo real de punta a punta** una vez cargadas las
  credenciales: registro, confirmación de correo, aprobación desde el panel
  de admin, y generación de un quiz real.
- Íconos de la PWA son un SVG simple generado a mano — se podría mejorar el
  diseño visual del ícono antes de publicar en Play Store.
- Sin tests automatizados todavía (se verificó todo manualmente con
  Playwright durante el desarrollo).
