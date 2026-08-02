package com.finanzasbrutal.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate
import java.time.temporal.ChronoUnit

@Entity(tableName = "gastos_fijos")
data class GastoFijo(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val nombre: String,
    val monto: Double,
    val categoria: CategoriaGasto,
    val activo: Boolean = true,
    val esDeuda: Boolean = false,
    val mesesTotales: Int? = null,
    val fechaInicio: LocalDate? = null,
    val orden: Int = 0
) {
    /** Cuotas restantes de una deuda con plazo definido, o null si no aplica. */
    fun mesesRestantes(hoy: LocalDate = LocalDate.now()): Int? {
        if (!esDeuda || mesesTotales == null || fechaInicio == null) return null
        val transcurridos = ChronoUnit.MONTHS.between(fechaInicio, hoy).toInt()
        return (mesesTotales - transcurridos).coerceIn(0, mesesTotales)
    }
}
