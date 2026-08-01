package com.finanzasbrutal.app.util

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

object DateUtils {

    fun inicioSemana(fecha: LocalDate = LocalDate.now(), diaCorte: DayOfWeek = DayOfWeek.MONDAY): LocalDate {
        var dia = fecha
        while (dia.dayOfWeek != diaCorte) dia = dia.minusDays(1)
        return dia
    }

    fun inicioMes(fecha: LocalDate = LocalDate.now()): LocalDate = fecha.withDayOfMonth(1)

    fun finMes(fecha: LocalDate = LocalDate.now()): LocalDate =
        fecha.with(TemporalAdjusters.lastDayOfMonth())

    fun inicioAnio(fecha: LocalDate = LocalDate.now()): LocalDate = fecha.withDayOfYear(1)

    fun finAnio(fecha: LocalDate = LocalDate.now()): LocalDate = fecha.with(TemporalAdjusters.lastDayOfYear())

    val NOMBRES_MES = listOf(
        "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"
    )

    val NOMBRES_DIA = listOf(
        "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
    )
}
