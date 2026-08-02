package com.finanzasbrutal.app.data

import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.LocalDate

class GastoFijoTest {

    private fun deuda(fechaInicio: LocalDate, mesesTotales: Int = 5) = GastoFijo(
        nombre = "Deuda Cencosud",
        monto = 80_000.0,
        categoria = CategoriaGasto.DEUDA,
        esDeuda = true,
        mesesTotales = mesesTotales,
        fechaInicio = fechaInicio
    )

    @Test
    fun `mesesRestantes es el total el mismo mes de inicio`() {
        val inicio = LocalDate.of(2026, 8, 1)
        assertEquals(5, deuda(inicio).mesesRestantes(inicio))
    }

    @Test
    fun `mesesRestantes decrece un mes por cada mes transcurrido`() {
        val inicio = LocalDate.of(2026, 8, 1)
        assertEquals(3, deuda(inicio).mesesRestantes(inicio.plusMonths(2)))
    }

    @Test
    fun `mesesRestantes no baja de cero pasado el plazo`() {
        val inicio = LocalDate.of(2026, 8, 1)
        assertEquals(0, deuda(inicio).mesesRestantes(inicio.plusMonths(10)))
    }

    @Test
    fun `mesesRestantes es null si el gasto fijo no es deuda`() {
        val gasto = GastoFijo(nombre = "Luz", monto = 170_000.0, categoria = CategoriaGasto.SERVICIOS)
        assertNull(gasto.mesesRestantes())
    }
}
