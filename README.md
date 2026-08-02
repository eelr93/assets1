# FinanzasBrutal

App Android nativa (Kotlin + Jetpack Compose) para llevar el control personal de ingresos y gastos.

## Stack

- Kotlin 2.0 + Jetpack Compose (Material 3)
- Room (persistencia offline)
- MVVM + Repository pattern, ViewModel + StateFlow
- Navigation Compose
- WorkManager (ingreso semanal automático y alertas)
- Gráficos dibujados con Canvas (sin librerías externas)
- Biometric / PIN (bloqueo de acceso)
- FileProvider (exportar CSV)

minSdk 26 · targetSdk/compileSdk 34.

## Funcionalidades

- Dashboard, ingresos, gastos fijos/variables, gráficos y ajustes (ver secciones de abajo).
- **Lista rápida** (pestaña dentro de Gastos): cargás un "capital disponible" (por
  defecto tu saldo actual), agregás productos con precio uno por uno y ves el
  dinero disponible restarse en vivo; al confirmar, se guardan como gastos reales.
- **Bloqueo con PIN/huella**: opcional desde Ajustes > Seguridad. Usa
  `BiometricPrompt` con fallback a un PIN de 4-6 dígitos (se guarda solo el hash
  SHA-256, nunca el PIN en texto plano).
- **Exportar CSV**: desde Ajustes, genera un CSV con todo el historial de
  ingresos y gastos y abre el selector de apps de Android para compartirlo/guardarlo.
- **Metas de ahorro por objetivo**: en el Dashboard, creá metas (ej. "Vacaciones"),
  aportales dinero y seguí el progreso con una barra, además de la meta de ahorro
  mensual única.
- **Comparado con el mes anterior**: en el Dashboard, gasto y ahorro del mes actual
  vs. el anterior con variación %.
- El umbral de alerta de gasto (por defecto 60% del ingreso mensual estimado) es
  editable con un slider en Ajustes > Notificaciones.

## Tests y CI

- Tests unitarios de la lógica de negocio en `app/src/test` (reglas del ingreso
  semanal/catch-up, alerta de gasto, deuda por vencer, utilidades de fecha), con
  fakes en memoria de los DAO de Room — no requieren Android ni un dispositivo.
- `.github/workflows/android-ci.yml` corre lint + tests unitarios + `assembleDebug`
  en cada push/PR y sube el APK de debug como artifact. Es la primera verificación
  real de que el proyecto compila, ya que este entorno no tiene el SDK de Android.

## Cómo abrir el proyecto

1. Abrir la carpeta raíz con Android Studio (Koala o superior).
2. Dejar que Gradle sincronice (descarga las dependencias de Google/Maven Central).
3. Ejecutar en un emulador o dispositivo con Android 8.0 (API 26) o superior.

Este proyecto se generó en un entorno sin acceso a los repositorios de Google
Maven ni al Android SDK, así que no pudo compilarse ni ejecutarse ahí — por eso
existe el workflow de CI (ver arriba), que sí corre con el SDK real y ya
verificó que compila. Aun así, conviene correrlo una vez en Android Studio antes
de darlo por cerrado, sobre todo para probar la app en uso (permisos, notificaciones, etc.).

## Instalar en tu celular (build de release firmado)

El CI solo genera un APK de debug (para probar). Para instalar una versión real en
tu teléfono sin pasar por Play Store:

1. Generá tu keystore una sola vez (guardalo con backup, si lo perdés no podés
   actualizar la app más adelante):
   ```
   keytool -genkeypair -v -keystore finanzasbrutal-release.jks -alias finanzasbrutal \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Copiá `keystore.properties.example` a `keystore.properties` (raíz del repo) y
   completá la ruta del `.jks` y las contraseñas que elegiste. Ese archivo está en
   `.gitignore`: nunca se sube al repo.
3. Generá el APK firmado:
   ```
   ./gradlew assembleRelease
   ```
   Sale en `app/build/outputs/apk/release/app-release.apk`. Instalalo en el
   teléfono (`adb install app-release.apk`, o transferilo y abrilo habilitando
   "instalar apps de origen desconocido").

Sin `keystore.properties`, `assembleRelease` igual compila pero el APK queda sin
firmar (no instalable en un dispositivo real). El build de release tiene
`minifyEnabled`/`shrinkResources` activados; si alguna vez ves un crash raro solo
en release y no en debug, probá desactivarlos temporalmente en `app/build.gradle.kts`
para descartar que sea una regla de ProGuard/R8 faltante.

## Datos precargados

Al primer arranque la app siembra automáticamente:

- Ingreso semanal automático (todos los lunes): $339.120 ARS
- Meta de ahorro mensual inicial: $150.000 ARS
- Gastos fijos mensuales: gasolina, ansiolíticos, antidepresivos, gym + entrenador,
  suscripciones, luz, comida y la deuda Cencosud (5 cuotas de $80.000 ARS)

Todo esto es editable desde la pantalla de Ajustes / Gastos fijos.
