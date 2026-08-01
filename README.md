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

Este proyecto se generó y validó estructuralmente en un entorno sin acceso a los
repositorios de Google Maven ni al Android SDK, así que **no fue compilado ni
ejecutado en ese entorno**. Antes de dar el desarrollo por cerrado, hay que
sincronizarlo y correrlo una vez en Android Studio.

## Datos precargados

Al primer arranque la app siembra automáticamente:

- Ingreso semanal automático (todos los lunes): $339.120 ARS
- Meta de ahorro mensual inicial: $150.000 ARS
- Gastos fijos mensuales: gasolina, ansiolíticos, antidepresivos, gym + entrenador,
  suscripciones, luz, comida y la deuda Cencosud (5 cuotas de $80.000 ARS)

Todo esto es editable desde la pantalla de Ajustes / Gastos fijos.
