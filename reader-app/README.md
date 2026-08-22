# Lectura Accesible

Lector de EPUB, PDF y TXT para alguien operado de cataratas en ambos ojos. Letra
grande de a un toque, temas de alto contraste, un párrafo resaltado para no
perder el renglón, y voz en alta para cuando los ojos se cansan.

**En línea: https://lectura-accesible.pages.dev**

Los libros nunca salen del teléfono: se guardan en el propio navegador.

## Empezar

```bash
npm install
npm run dev
```

## Publicar

```bash
# lo que está en línea: sitio estático, sin servidor ni cuentas
npm run build:lector
npx wrangler pages deploy out --project-name lectura-accesible --branch main --commit-dirty=true

# producto completo, con cuentas y quiz de IA (necesita credenciales)
npm run build
```

Los dos builds salen del mismo código: la app se adapta a lo que encuentra en su
entorno. Sin las variables de Supabase no hay login, ni barra de sesión, ni
botón de quiz.

## Antes de tocar el código

**Leer [`HANDOFF.md`](./HANDOFF.md).** Está el estado real, qué se probó y qué
no, y las trampas que ya costaron una vuelta cada una — sobre todo alrededor de
la voz neuronal, el worker y Safari en iPhone.

La puesta en marcha con credenciales está en [`SETUP.md`](./SETUP.md).
