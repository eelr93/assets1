package com.finanzasbrutal.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate

/** Fila única (id=1) con las preferencias del usuario. */
@Entity(tableName = "configuracion")
data class Configuracion(
    @PrimaryKey val id: Int = 1,
    val metaAhorroMensual: Double,
    val ingresoSemanalAuto: Double,
    val diaCorteIngreso: Int, // 1=Lunes .. 7=Domingo (java.time.DayOfWeek.value)
    val umbralAlertaPorcentaje: Double,
    val notificacionesActivas: Boolean,
    val ultimoIngresoAutoGenerado: LocalDate? = null
)

object ConfiguracionPorDefecto {
    fun crear(): Configuracion = Configuracion(
        id = 1,
        metaAhorroMensual = 150_000.0,
        ingresoSemanalAuto = 339_120.0,
        diaCorteIngreso = 1,
        umbralAlertaPorcentaje = 0.6,
        notificacionesActivas = true,
        ultimoIngresoAutoGenerado = null
    )
}
