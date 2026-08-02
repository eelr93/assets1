package com.finanzasbrutal.app.data.repository

data class PuntoHistorial(
    val etiqueta: String,
    val ingreso: Double,
    val gasto: Double
) {
    val ahorro: Double get() = ingreso - gasto
}
