package com.finanzasbrutal.app.data.local.entity

import java.time.LocalDate

/** Semilla inicial de gastos fijos mensuales del usuario. */
object GastosFijosPorDefecto {
    fun crear(hoy: LocalDate = LocalDate.now()): List<GastoFijo> = listOf(
        GastoFijo(nombre = "Gasolina", monto = 129_900.0, categoria = CategoriaGasto.GASOLINA, orden = 0),
        GastoFijo(nombre = "Ansiolíticos", monto = 173_200.0, categoria = CategoriaGasto.SALUD, orden = 1),
        GastoFijo(nombre = "Antidepresivos", monto = 80_000.0, categoria = CategoriaGasto.SALUD, orden = 2),
        GastoFijo(nombre = "Gym + entrenador", monto = 81_000.0, categoria = CategoriaGasto.GYM, orden = 3),
        GastoFijo(
            nombre = "Suscripciones (HBO+, ChatGPT, YouTube, Google, Claude Pro)",
            monto = 92_800.0,
            categoria = CategoriaGasto.SUSCRIPCIONES,
            orden = 4
        ),
        GastoFijo(nombre = "Luz", monto = 170_000.0, categoria = CategoriaGasto.SERVICIOS, orden = 5),
        GastoFijo(nombre = "Comida", monto = 510_755.0, categoria = CategoriaGasto.COMIDA, orden = 6),
        GastoFijo(
            nombre = "Deuda Cencosud",
            monto = 80_000.0,
            categoria = CategoriaGasto.DEUDA,
            esDeuda = true,
            mesesTotales = 5,
            fechaInicio = hoy,
            orden = 7
        )
    )
}
