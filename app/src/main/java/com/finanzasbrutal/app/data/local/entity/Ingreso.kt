package com.finanzasbrutal.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.time.LocalDate
import java.time.LocalDateTime

@Entity(tableName = "ingresos")
data class Ingreso(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val monto: Double,
    val fecha: LocalDate,
    val descripcion: String,
    val tipo: TipoIngreso,
    val creadoEn: LocalDateTime = LocalDateTime.now()
)
