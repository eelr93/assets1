package com.finanzasbrutal.app.data

import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.local.entity.ConfiguracionPorDefecto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.fakes.FakeConfiguracionDao
import com.finanzasbrutal.app.fakes.FakeGastoDao
import com.finanzasbrutal.app.fakes.FakeGastoFijoDao
import com.finanzasbrutal.app.fakes.FakeIngresoDao
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

class FinanzasRepositoryTest {

    private lateinit var gastoFijoDao: FakeGastoFijoDao
    private lateinit var repository: FinanzasRepository

    @Before
    fun setUp() {
        gastoFijoDao = FakeGastoFijoDao()
        repository = FinanzasRepository(
            FakeIngresoDao(),
            FakeGastoDao(),
            gastoFijoDao,
            FakeConfiguracionDao(ConfiguracionPorDefecto.crear())
        )
    }

    @Test
    fun `asegurarIngresosSemanales genera un unico ingreso la primera vez`() = runTest {
        val lunes = LocalDate.of(2026, 8, 3) // un lunes

        val nuevos = repository.asegurarIngresosSemanales(lunes)

        assertEquals(1, nuevos.size)
        assertEquals(lunes, nuevos.first())
    }

    @Test
    fun `asegurarIngresosSemanales no duplica si ya esta al dia`() = runTest {
        val lunes = LocalDate.of(2026, 8, 3)
        repository.asegurarIngresosSemanales(lunes)

        val segundaLlamada = repository.asegurarIngresosSemanales(lunes)

        assertTrue(segundaLlamada.isEmpty())
    }

    @Test
    fun `asegurarIngresosSemanales hace catch-up de varias semanas transcurridas`() = runTest {
        val primerLunes = LocalDate.of(2026, 8, 3)
        repository.asegurarIngresosSemanales(primerLunes)

        val tresSemanasDespues = primerLunes.plusWeeks(3)
        val nuevos = repository.asegurarIngresosSemanales(tresSemanasDespues)

        assertEquals(3, nuevos.size)
        assertEquals(primerLunes.plusWeeks(1), nuevos[0])
        assertEquals(primerLunes.plusWeeks(2), nuevos[1])
        assertEquals(primerLunes.plusWeeks(3), nuevos[2])
    }

    @Test
    fun `verificarAlertaGastos es true cuando el gasto del mes supera el 60 por ciento`() = runTest {
        val hoy = LocalDate.of(2026, 8, 15)
        // Ingreso mensual estimado ~ 339120 * 52 / 12 ~ 1469520. 60% ~ 881712.
        repository.registrarGasto(950_000.0, "Gasto grande", CategoriaGasto.COMIDA, hoy)

        assertTrue(repository.verificarAlertaGastos(hoy))
    }

    @Test
    fun `verificarAlertaGastos es false cuando el gasto del mes no supera el umbral`() = runTest {
        val hoy = LocalDate.of(2026, 8, 15)
        repository.registrarGasto(100_000.0, "Gasto chico", CategoriaGasto.COMIDA, hoy)

        assertFalse(repository.verificarAlertaGastos(hoy))
    }

    @Test
    fun `deudasPorVencer devuelve la deuda cuando queda 1 cuota`() = runTest {
        val hoy = LocalDate.of(2026, 8, 1)
        gastoFijoDao.insertarTodos(
            listOf(
                GastoFijo(
                    nombre = "Deuda Cencosud",
                    monto = 80_000.0,
                    categoria = CategoriaGasto.DEUDA,
                    esDeuda = true,
                    mesesTotales = 5,
                    fechaInicio = hoy.minusMonths(4) // 4 de 5 cuotas ya pasaron: queda 1
                )
            )
        )

        val resultado = repository.deudasPorVencer(hoy)

        assertEquals(1, resultado.size)
        assertEquals("Deuda Cencosud", resultado.first().nombre)
    }

    @Test
    fun `deudasPorVencer no devuelve la deuda cuando quedan mas de 2 cuotas`() = runTest {
        val hoy = LocalDate.of(2026, 8, 1)
        gastoFijoDao.insertarTodos(
            listOf(
                GastoFijo(
                    nombre = "Deuda Cencosud",
                    monto = 80_000.0,
                    categoria = CategoriaGasto.DEUDA,
                    esDeuda = true,
                    mesesTotales = 5,
                    fechaInicio = hoy // recién empieza: quedan 5 cuotas
                )
            )
        )

        val resultado = repository.deudasPorVencer(hoy)

        assertTrue(resultado.isEmpty())
    }
}
