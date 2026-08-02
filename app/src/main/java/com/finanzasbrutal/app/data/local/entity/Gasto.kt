package com.finanzasbrutal.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate
import java.time.LocalDateTime

@Entity(tableName = "gastos")
data class Gasto(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val monto: Double,
    val fecha: LocalDate,
    val descripcion: String,
    val categoria: CategoriaGasto,
    val creadoEn: LocalDateTime = LocalDateTime.now()
)
