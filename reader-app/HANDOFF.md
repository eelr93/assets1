# Lectura Accesible — documento de traspaso

Estado al **22 de agosto de 2026**. Este archivo es lo primero que hay que leer
para retomar el proyecto desde otra sesión o desde otra computadora.

```
git clone https://github.com/eelr93/assets1.git
cd assets1
git checkout claude/accessible-reading-app-icddv1
cd reader-app
npm install
```

La guía de puesta en marcha con credenciales está en `SETUP.md`.

---

## Qué es

Lector de EPUB, PDF y TXT hecho para una persona operada de cataratas en ambos
ojos. Todo lo que tiene sale de ahí: letra grande de a un toque, temas de alto
contraste, un párrafo resaltado para no perder el renglón, voz en alta para
cuando los ojos se cansan.

**Está publicado y en uso: https://lectura-accesible.pages.dev** (Cloudflare
Pages, gratis, sin tarjeta).

Se publica en **modo solo lector**: sin cuentas y sin el quiz de IA, porque la
API de Anthropic se paga aparte de la suscripción de claude.ai. Eso no obligó a
recortar código — la app se adapta a lo que encuentra en su entorno:

```bash
npm run build:lector   # sitio estático → Cloudflare Pages (lo que está online)
npm run build          # app completa con cuentas y quiz → Vercel
```

Desplegar lo que está online:

```bash
npm run build:lector
npx wrangler pages deploy out --project-name lectura-accesible --branch main --commit-dirty=true
```

---

## Qué hay hecho

**Lectura**

- EPUB, PDF y TXT, normalizados a un modelo común de capítulos y párrafos.
- Tamaño de letra, tipografía, interlineado, espaciado de letras y palabras,
  ancho de columna, alineación. Cinco temas, incluidos nocturno y alto
  contraste. A− / A+ en el encabezado, a un toque, sin abrir ajustes.
- **Modo enfoque**: se toca el párrafo que se quiere leer y ese queda resaltado;
  el resto se atenúa. El toque es la interacción central — antes lo elegía la
  posición de la pantalla y había que dejar el texto a la altura exacta.
- **Bajar solo**: desplazamiento automático a velocidad regulable (− y + al
  lado del botón). La velocidad va en **renglones por minuto**, no en píxeles,
  porque el tamaño de letra cambia todo el tiempo. Sigue al capítulo siguiente
  al llegar al fondo.
- Índice, marcadores y búsqueda en un mismo panel. Lo buscado queda **marcado en
  azul** dentro del texto, distinto del ámbar del párrafo que se lee.
- Progreso por libro, "Seguir leyendo" en la biblioteca, pantalla que no se
  apaga, instalable en iPhone y Android.

**Voz**

- Voz del sistema (`speechSynthesis`), con velocidad, elección de voz, botón
  **Probar** y temporizador para dormirse. Sigue sola al capítulo siguiente.
- Tocar un párrafo mientras lee **manda la voz a ese punto**.
- Voces neuronales (Piper/VITS) descargables, que corren en el teléfono sin
  servidor. **Están detrás de una advertencia, ver más abajo.**

---

## Lo que hay que saber antes de tocar nada

### La voz neuronal en el teléfono no sirve, y por qué se dejó igual

Medido en el iPhone de la usuaria: **20 a 30 segundos por párrafo**. No es un
problema de ajuste, está a un orden de magnitud de ser usable. Se dejó porque en
computadora anda bien y suena mejor que cualquier voz del sistema, pero pasó a
ser una sección cerrada, detrás de un botón que dice ese número.

**El camino que sí sirve en un iPhone son las voces «premium» del sistema**
(Ajustes → Accesibilidad → Contenido hablado → Voces → Español). Son neuronales
igual, pero las genera el chip del teléfono, así que salen al instante. La app
ya las usa y el aviso está destacado arriba de todo en el panel de voz.

Antes de intentar acelerar esto de nuevo, saber que ya se hizo:

- La sesión de ONNX y la configuración se arman **una vez por voz**, no por
  párrafo (era lo más caro con diferencia: releer y reparsear 20 MB cada vez).
- Se generan **tres párrafos por adelantado**, encolados de a uno.
- Lo que queda por hacer sería multihilo en WASM, que exige aislamiento entre
  orígenes (`COOP`/`COEP`). Daría quizá 2–4×, sigue sin alcanzar, y `COEP:
  require-corp` puede romper la carga de los modelos y de las fuentes. No se
  intentó por eso.

### Errores de `@diffusionstudio/vits-web` que ya están sorteados

De esa biblioteca se usa **solo el fonemizador y `predict` como respaldo**.
Bajar, guardar, listar y borrar están escritos en `vozNatural.worker.ts` porque
los suyos no funcionan en iPhone y fallan **sin decir nada**:

- Su `download` no espera a que termine la escritura (descarta la promesa), así
  que avisa "listo" cuando todavía no guardó nada.
- Guarda con `createWritable()`, **que Safari no tiene hasta iOS 17**, adentro de
  un `try/catch` que solo hace `console.error`. En un iPhone eso era: bajar
  60 MB, no guardar nada, y que no se entere nadie. La vía que sí anda es
  `createSyncAccessHandle()`, que **solo existe dentro de un worker**.
- Su catálogo no trae la voz argentina ni la mexicana liviana. `PATH_MAP` está
  exportado y es un objeto común, así que se le agregan a mano; como la URL base
  apunta a un espejo incompleto y es constante, la ruta de esas dos sube cuatro
  niveles con `..` y baja al repositorio original de Piper. Se apoya en la
  normalización de URLs (RFC 3986), no en una casualidad, y está verificado
  contra el servidor.

### El worker de voz se arma aparte, con esbuild

`scripts/construir-worker-voz.mjs` → `public/voz-natural.worker.js`.

**No usar `new Worker(new URL("./x.worker.ts", import.meta.url))`.** Turbopack no
lo compila: lo copia tal cual, TypeScript crudo y con los imports sin resolver.
Encima queda con extensión `.ts` y Cloudflare lo sirve como `video/mp2t`, con lo
cual el navegador se niega a ejecutarlo. Los dos fallos juntos daban un botón
que no hacía absolutamente nada.

El script busca el fonemizador por patrón (`dist/piper-*.js`) en lugar de
escribir el nombre generado a mano, y **corta el build con un mensaje claro** si
no lo encuentra.

### Otras cosas que ya costaron una vuelta

- `speechSynthesis.cancel()` dispara `onend` **en otro turno del bucle de
  eventos**. Un booleano "estoy cancelando" que se apaga en el renglón siguiente
  llega tarde y la cancelación se lee como "terminó el capítulo": la voz saltaba
  de capítulo sola. Se resuelve con un número de tanda por locución.
- El audio de la voz neuronal usa **un único `<audio>` de módulo**. Safari solo
  deja sonar el que arrancó dentro de un toque, y ese permiso queda pegado a ese
  elemento; como generar el primer párrafo tarda, hay que habilitarlo con un WAV
  mudo en el mismo toque, antes de ponerse a generar.
- La caché de audio guarda **la promesa**, no el resultado. Guardando el
  resultado, el bucle pedía el mismo párrafo dos veces —una como anticipo y otra
  al llegar— y largaba dos modelos a la vez sobre el mismo texto.
- `scrollTop` redondea. Sumarle fracciones de píxel no mueve nada: la posición
  se lleva aparte con decimales. Y hay que comprobar cuál es el elemento que de
  verdad scrollea, porque escribirle a uno que no scrollea no falla ni avisa.
- `pdfjs-dist` está fijado en **4.9.155**. Las 6.x usan
  `Map.prototype.getOrInsertComputed`, que muchos navegadores todavía no tienen.
- Cada tienda de `idb-keyval` necesita **su propia base**. Si comparten nombre,
  solo se crea la primera.
- Cloudflare Pages no publica archivos de más de **25 MiB**.

---

## Lo que nadie verificó

Esto importa tanto como lo anterior. **Todo el desarrollo se hizo sin poder
abrir un navegador.** Lo verificado es que el servidor entrega los archivos
correctos y que el código compila, no que se vea ni suene bien.

Confirmado por la usuaria probando en su teléfono:

- El resaltado se ve. El "bajar solo" funciona. La voz avanza de párrafo.
- La voz neuronal tarda 20–30 s por párrafo.

Sin confirmar:

- Si las voces «premium» de iOS suenan bien (es lo primero que habría que
  probar; resolvería el pedido original sin nada de la voz neuronal).
- Cómo se ve en pantallas distintas de la suya.
- Si algún EPUB o PDF real abre mal.

---

## Pendiente

**En el teléfono, cinco minutos:** bajar una voz «premium» de iOS y probarla
desde el panel de voz. Si suena bien, el tema de la voz está cerrado.

**Si se quiere el producto completo** (cuentas + quiz de IA), está todo escrito y
compila; falta cargar credenciales y probar el flujo de punta a punta. Pasos en
`SETUP.md`.

**Ideas ofrecidas y no hechas:** notas sobre los marcadores, pellizcar para
agrandar la letra, resaltado palabra por palabra mientras habla (usa
`onboundary`, que en Safari de iPhone históricamente no se dispara).

**No es posible**, aunque parezca: controlar la lectura desde la pantalla
bloqueada del iPhone. Safari suspende la voz al bloquear. La única salida sería
audio generado en un servidor, que cuesta dinero.

---

## Estructura

```
reader-app/
  scripts/
    construir-worker-voz.mjs   # arma public/voz-natural.worker.js (esbuild)
    copy-pdf-worker.mjs        # copia el worker de pdf.js (postinstall)
    generar-iconos.mjs
  src/
    app/
      layout.tsx               # fuentes, providers, ícono de iPhone
      globals.css              # temas de lectura, resaltado, hallazgos
      api/quiz/route.ts        # quiz (solo en el build completo)
    components/
      AppShell.tsx             # biblioteca / lector / admin
      AuthGate.tsx             # deja pasar si no hay cuentas configuradas
      Library.tsx, BookCard.tsx
      Reader.tsx               # el lector: resaltado, foco, búsqueda marcada
      BarraVoz.tsx             # controles de voz y de "bajar solo"
      PanelVozNatural.tsx      # descarga y elección de voces neuronales
      PanelIndice.tsx          # capítulos / marcadores / búsqueda
      SettingsPanel.tsx, AvisoInstalar.tsx, Quiz.tsx
    context/
      SettingsContext.tsx      # ajustes de lectura (localStorage)
      AuthContext.tsx
    lib/
      useVozAlta.ts            # voz del sistema + motor de la voz neuronal
      vozNatural.ts            # cliente del worker, audio único de módulo
      vozNatural.worker.ts     # descarga, guardado y generación
      useDesplazamientoAuto.ts # "bajar solo"
      usePantallaEncendida.ts
      text.ts                  # texto plano, texto para voz, marcarTermino
      db.ts, types.ts, sanitize.ts, parsers/
  public/
    voz-natural.worker.js      # generado en cada build, no versionado
    pdf.worker.min.mjs         # generado al instalar, no versionado
```
