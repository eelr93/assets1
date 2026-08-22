# Puesta en marcha

Pasos para dejar la app funcionando con cuentas de usuario, moderación y el quiz de IA.

## 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com), creá una cuenta (gratis) y un proyecto nuevo.
2. En **SQL Editor**, pegá y ejecutá todo el contenido de `supabase/migration.sql`. Esto crea la tabla de perfiles, las reglas de acceso, y hace que cada persona que se registre quede en estado "pending" hasta que la aprobés.
3. En **Project Settings > API**, copiá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Por defecto Supabase envía el correo de confirmación de registro con su propio servicio (sin configuración extra), aunque con límite de envíos bajo. Si esperás muchos registros, configurá un proveedor SMTP propio en **Authentication > Emails**.

## 2. Obtener la API key de Anthropic

1. Entrá a [console.anthropic.com](https://console.anthropic.com) (es una cuenta distinta a la de claude.ai) y generá una API key.
2. Cargá crédito — el quiz usa un modelo económico (Haiku) y cada generación cuesta fracciones de centavo, pero necesitás saldo cargado.
3. Copiá la key a `ANTHROPIC_API_KEY`.

## 3. Variables de entorno

Copiá `.env.local.example` a `.env.local` y completá los tres valores de arriba.

## 4. Correr localmente

```
npm install
npm run dev
```

## 5. Volverte administrador

1. Con la app corriendo, registrate normalmente desde la pantalla de login (con tu propio correo).
2. Confirmá el correo (revisá spam si no llega).
3. En Supabase > SQL Editor, corré (reemplazando tu email):

```sql
update public.profiles set is_admin = true, status = 'approved' where email = 'tu-email@ejemplo.com';
```

4. Volvé a entrar a la app: ahora vas a ver el botón "Administrar usuarios" para aprobar o rechazar a los demás.

## 6. Publicar la app (hosting)

Hay **dos formas de publicarla, con el mismo código**. Cuál usás depende de si
querés solo el lector o también el quiz con IA.

### 6.a — Solo lector (sin servidor, sin cuentas, sin costo)

```bash
npm run build:lector      # genera out/
wrangler pages deploy out --project-name lectura-accesible --branch main --commit-dirty=true
```

Publicado en **https://lectura-accesible.pages.dev** (Cloudflare Pages).

Esto sale como sitio estático puro: no hay servidor, no hace falta Supabase ni
la clave de Anthropic, y no cuesta nada. Se puede instalar desde Chrome como
app y funciona sin internet.

**Por qué alcanza:** el lector entero ocurre en el teléfono. Los libros se
guardan en IndexedDB, los parsers de EPUB, PDF y TXT corren en el navegador y
los ajustes van en `localStorage`. Nada de eso necesita backend. Lo único que sí
lo necesita es el quiz, y en este modo no se publica — `/api/quiz` devuelve 404.

**La app se adapta sola.** Sin las variables de Supabase no muestra login, ni
barra de sesión, ni el botón del quiz (ver `AuthGate.tsx`). No es una versión
recortada ni una rama aparte: es el mismo código leyendo su entorno.

**Nota sobre el motor de voz neuronal:** los dos comandos de build arman primero
`public/voz-natural.worker.js` con esbuild (`npm run build:voz`, que corre
solo). Ese archivo no se versiona. Si el build corta ahí, leer el comentario de
`scripts/construir-worker-voz.mjs`: explica por qué no se puede dejar que
Turbopack empaquete ese worker.

### 6.b — App completa (con cuentas y quiz)

```bash
npm run build
```

Desplegá en [Vercel](https://vercel.com) — es de los mismos que hacen Next.js,
así que no hay nada que configurar — y cargá ahí las variables del paso 3, en
**Project Settings > Environment Variables**.

**No sirve Cloudflare Pages para este modo**: la ruta `/api/quiz` necesita
correr en un servidor, y Cloudflare exigiría el adaptador `@opennextjs/cloudflare`,
que a esta altura no cubre Next 16 con garantías. Firebase Hosting tampoco:
el SSR de Next pide Cloud Functions, o sea plan Blaze, o sea tarjeta.

Para pasar de 6.a a 6.b no hay que reescribir nada — se cargan las claves y se
publica con el otro comando.

## 7. Subir a Play Store

La app ya es una PWA instalable. Para publicarla en Play Store sin reescribirla como app nativa, se empaqueta con **Bubblewrap** (herramienta oficial de Google para convertir una PWA en un Android App Bundle):

1. Con la app ya desplegada en un dominio HTTPS real (paso 6), instalá Bubblewrap: `npm i -g @bubblewrap/cli`.
2. `bubblewrap init --manifest=https://tu-dominio.com/manifest.webmanifest`
3. Seguí el asistente (usa los datos del manifest que ya generamos: nombre, ícono, color).
4. `bubblewrap build` genera el `.aab` para subir a Play Console.
5. Hay que publicar un archivo `assetlinks.json` en `https://tu-dominio.com/.well-known/assetlinks.json` para verificar que el dominio y la app son tuyos (Bubblewrap te da el contenido exacto al final del build).

Avisame cuando tengas el dominio de despliegue listo y armamos ese último archivo juntos.
