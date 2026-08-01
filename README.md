# FinanzasBrutal

App Android nativa (Kotlin + Jetpack Compose) para llevar el control personal de ingresos y gastos.

## Stack

- Kotlin 2.0 + Jetpack Compose (Material 3)
- Room (persistencia offline)
- MVVM + Repository pattern, ViewModel + StateFlow
- Navigation Compose
- WorkManager (ingreso semanal automático y alertas)
- Gráficos dibujados con Canvas (sin librerías externas)

minSdk 26 · targetSdk/compileSdk 34.

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
