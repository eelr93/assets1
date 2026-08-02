package com.finanzasbrutal.app.data.local

import androidx.room.TypeConverter
import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.local.entity.TipoIngreso
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset

class Converters {

    @TypeConverter
    fun fromEpochDay(value: Long?): LocalDate? = value?.let { LocalDate.ofEpochDay(it) }

    @TypeConverter
    fun localDateToEpochDay(fecha: LocalDate?): Long? = fecha?.toEpochDay()

    @TypeConverter
    fun fromEpochSecond(value: Long?): LocalDateTime? =
        value?.let { LocalDateTime.ofEpochSecond(it, 0, ZoneOffset.UTC) }

    @TypeConverter
    fun localDateTimeToEpochSecond(fecha: LocalDateTime?): Long? =
        fecha?.toEpochSecond(ZoneOffset.UTC)

    @TypeConverter
    fun toTipoIngreso(value: String?): TipoIngreso? = value?.let { TipoIngreso.valueOf(it) }

    @TypeConverter
    fun fromTipoIngreso(tipo: TipoIngreso?): String? = tipo?.name

    @TypeConverter
    fun toCategoriaGasto(value: String?): CategoriaGasto? = value?.let { CategoriaGasto.valueOf(it) }

    @TypeConverter
    fun fromCategoriaGasto(categoria: CategoriaGasto?): String? = categoria?.name
}
