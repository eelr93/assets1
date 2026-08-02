package com.finanzasbrutal.app.util

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate

class DateUtilsTest {

    @Test
    fun `inicioSemana devuelve el mismo dia si ya es el dia de corte`() {
        val lunes = LocalDate.of(2026, 8, 3)
        assertEquals(lunes, DateUtils.inicioSemana(lunes, DayOfWeek.MONDAY))
    }

    @Test
    fun `inicioSemana retrocede hasta el ultimo dia de corte`() {
        val jueves = LocalDate.of(2026, 8, 6)
        val lunesDeEsaSemana = LocalDate.of(2026, 8, 3)
        assertEquals(lunesDeEsaSemana, DateUtils.inicioSemana(jueves, DayOfWeek.MONDAY))
    }

    @Test
    fun `inicioMes devuelve el primer dia del mes`() {
        val fecha = LocalDate.of(2026, 8, 17)
        assertEquals(LocalDate.of(2026, 8, 1), DateUtils.inicioMes(fecha))
    }

    @Test
    fun `finMes devuelve el ultimo dia del mes`() {
        val fecha = LocalDate.of(2026, 2, 5) // 2026 no es bisiesto
        assertEquals(LocalDate.of(2026, 2, 28), DateUtils.finMes(fecha))
    }
}
