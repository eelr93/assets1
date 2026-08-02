package com.finanzasbrutal.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate

@Entity(tableName = "metas_ahorro")
data class MetaAhorro(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nombre: String,
    val montoObjetivo: Double,
    val montoAportado: Double = 0.0,
    val fechaCreacion: LocalDate = LocalDate.now(),
    val completada: Boolean = false
) {
    val progreso: Float
        get() = if (montoObjetivo <= 0) 0f else (montoAportado / montoObjetivo).toFloat().coerceIn(0f, 1f)
}
