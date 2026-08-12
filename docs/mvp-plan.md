# Mapa Virtual La Rioja — Plan de producto (MVP)

Plataforma de mapa interactivo para que comercios y pymes de La Rioja "alquilen" un espacio publicitario virtual, organizados por zona y categoría, sin ser una experiencia VR ni depender de fondos públicos.

---

## 1. Definición del MVP

**Qué es:** una PWA (web app instalable, sin passar por App Store/Play Store) con un mapa de la provincia dividido en zonas (Capital, Chilecito, Chamical, Aimogasta, Villa Unión, Chepes, etc.). Cada negocio tiene un pin con ficha básica.

**Qué NO es en el MVP:**
- No es una app nativa (costo de desarrollo y mantenimiento en dos plataformas no se justifica todavía).
- No tiene stock en tiempo real ni integración con sistemas de punto de venta.
- No tiene VR ni recorridos 3D.
- No tiene alta 100% autoservicio al inicio (ver riesgos).

**Funcionalidades del MVP:**
1. Mapa interactivo (Leaflet + OpenStreetMap — gratis, sin costo por uso, a diferencia de Google Maps API).
2. Filtro por zona y por categoría (gastronomía, indumentaria, servicios, turismo, artesanías, etc.).
3. Ficha de negocio: nombre, rubro, fotos (2-4), descripción corta, horario, botón directo a WhatsApp, redes sociales.
4. Estado simple: "Abierto ahora / Cerrado" y "Con stock / Consultar disponibilidad" (binario, no catálogo).
5. **Aviso visible y permanente** en cada ficha y pin: *"Espacio publicitario virtual — este negocio no está físicamente en esta ubicación del mapa"*, con la zona real y (si el negocio quiere) su dirección real aparte.
6. Panel de administración simple (vos) para dar de alta y editar negocios.
7. Panel del negocio (fase 1.5): login simple para que ellos mismos actualicen estado/fotos.

**Fuera del MVP (fase 2+):** catálogo de productos, reservas, pagos online, integración POS, app nativa, geolocalización del usuario en tiempo real.

---

## 2. El problema del stock y la actualización

Full stock en tiempo real **no es viable** con pymes chicas sin sistemas digitales. Enfoque por niveles, del más simple al más costoso:

| Nivel | Qué implica | Esfuerzo del comercio |
|---|---|---|
| **0 — Base (obligatorio)** | Info estática: rubro, horario, contacto, fotos | Una carga inicial, nada más |
| **1 — Estado (recomendado)** | Toggle "hay / no hay" o "disponible esta semana" | 1 click, o responder un WhatsApp automático semanal |
| **2 — Destacados (opcional)** | 5-10 productos/servicios estrella con foto y precio, sin inventario completo | Actualización manual esporádica |

**Mecanismos para sostenerlo:**
- Mostrar siempre "Última actualización: hace X días" en la ficha — transparencia y presión social suave.
- Recordatorio automático semanal por WhatsApp ("¿Seguís con stock/disponible? Respondé SÍ o NO") que actualiza el estado sin que el comercio entre a ninguna plataforma.
- Fichas sin actualizar hace mucho bajan de posición en el listado de su categoría (no se banean, pero pierden visibilidad).
- No perseguir integración con sistemas de stock reales: no existen en la mayoría de estos comercios, y construirlo cuesta más que todo el resto del proyecto junto.

---

## 3. Modelos de monetización

1. **Alquiler de espacio virtual (núcleo del negocio):**
   - Plan Gratis: ficha básica, aparece en su categoría/zona sin destacar.
   - Plan Destacado (pago mensual bajo, ej. equivalente a una suscripción de streaming): pin más grande, aparece primero en su categoría, foto de portada.
   - Precio diferenciado por categoría/zona según demanda (gastronomía en Capital vale más que un rubro con poca competencia en Chamical).
2. **Servicio de armado de ficha:** muchos comercios no van a poder cargar fotos/texto solos — cobrar un servicio puntual de "te armamos tu ficha" (fuente de ingreso adicional y también resuelve el problema de adopción).
3. **Auspicios locales:** cámaras de comercio, cooperativas o marcas provinciales como sponsors de una zona o sección (turismo, por ejemplo) — complementario, nunca la base del modelo.
4. **Freemium con volumen:** el plan gratis sirve para llenar el mapa rápido y generar la sensación de "todos están", lo pago financia la plataforma.

Evitar activamente cualquier dependencia de fondos públicos o subsidios provinciales como sostén del modelo — puede usarse como impulso puntual (ej. lanzamiento), no como base.

---

## 4. Estructura básica de la plataforma

- **Frontend:** PWA mobile-first (instalable desde el navegador, sin costo de tiendas de apps). Mapa con Leaflet/OpenStreetMap.
- **Backend:** stack simple y de bajo costo operativo (ej. Supabase o Firebase) — evitar infraestructura propia compleja al inicio.
- **Contacto:** enlaces directos a `wa.me` (WhatsApp) — es el canal que ya usan los comercios, no requiere que aprendan nada nuevo.
- **Panel admin (vos):** alta/edición/moderación de negocios, sobre todo en la fase inicial de alta asistida.
- **Panel negocio (fase 1.5):** login básico para autogestionar estado y fotos.
- **Datos:** zonas (Capital, Chilecito, Chamical, Aimogasta, Chepes, Villa Unión, etc.) y categorías como taxonomía fija, editable desde el admin.

---

## 5. Riesgos principales y mitigación

| Riesgo | Mitigación |
|---|---|
| Confusión sobre la ubicación real del negocio | Aviso visible y permanente en cada pin/ficha + mostrar la zona/dirección real por separado |
| Baja adopción por bajo poder adquisitivo y poca cultura digital | Alta asistida (vos cargás la ficha inicial), precios muy bajos, arrancar con una zona/rubro piloto |
| Desactualización de la info/stock | Recordatorios automáticos por WhatsApp, mostrar fecha de última actualización, bajar posición si no se actualiza |
| Competencia "gratis" de Instagram/Facebook/grupos de WhatsApp que ya usan los comercios | No competir en lo que ya hacen bien; diferenciarse por el mapa geolocalizado y la agregación por zona/categoría |
| Sostenibilidad económica en el arranque (pocos clientes, costos fijos) | Empezar con una zona acotada, validar antes de escalar a toda la provincia |
| Cuestión legal/consumidor por decir "está acá" sin estar físicamente | Disclaimer claro y consistente en toda la plataforma, redactado con cuidado (no es solo un detalle de diseño) |
| Dependencia de una sola persona para altas y soporte | Documentar el proceso de alta/edición desde el día uno para poder delegarlo cuando escale |

---

## 6. Resumen ejecutivo

La Rioja tiene muchas pymes y comercios chicos con baja presencia digital y poco presupuesto. Esta plataforma les da visibilidad geolocalizada por zona y categoría a través de un mapa interactivo simple, usable desde el celular, sin necesidad de VR ni de una app nativa. Cada negocio alquila un espacio publicitario virtual —siempre identificado como tal, con su ubicación real aclarada aparte— y mantiene su información con el mínimo esfuerzo posible: no un inventario en tiempo real, sino un estado simple de disponibilidad actualizable por WhatsApp. El modelo se sostiene con planes de suscripción de bajo costo (gratis + destacado pago) y servicios adicionales de armado de ficha, sin depender de fondos estatales. El mayor riesgo no es técnico sino de adopción: por eso el MVP prioriza alta asistida y una zona piloto antes de escalar a toda la provincia.
