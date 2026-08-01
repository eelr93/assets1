package com.finanzasbrutal.app.fakes

import com.finanzasbrutal.app.data.local.dao.ConfiguracionDao
import com.finanzasbrutal.app.data.local.dao.GastoDao
import com.finanzasbrutal.app.data.local.dao.GastoFijoDao
import com.finanzasbrutal.app.data.local.dao.IngresoDao
import com.finanzasbrutal.app.data.local.entity.Configuracion
import com.finanzasbrutal.app.data.local.entity.Gasto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.local.entity.Ingreso
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import java.time.LocalDate

/** Fakes en memoria de los DAO de Room, para poder testear FinanzasRepository sin Android. */

class FakeIngresoDao : IngresoDao {
    private val items = mutableListOf<Ingreso>()
    private var siguienteId = 1L
    private val flujo = MutableStateFlow<List<Ingreso>>(emptyList())

    override suspend fun insertar(ingreso: Ingreso): Long {
        val conId = ingreso.copy(id = siguienteId++)
        items.add(conId)
        flujo.value = items.toList()
        return conId.id
    }

    override suspend fun eliminar(ingreso: Ingreso) {
        items.removeAll { it.id == ingreso.id }
        flujo.value = items.toList()
    }

    override fun observarTodos(): StateFlow<List<Ingreso>> = flujo

    override suspend fun obtenerTodosOrdenAsc(): List<Ingreso> = items.sortedBy { it.fecha }
}

class FakeGastoDao : GastoDao {
    private val items = mutableListOf<Gasto>()
    private var siguienteId = 1L
    private val flujo = MutableStateFlow<List<Gasto>>(emptyList())

    override suspend fun insertar(gasto: Gasto): Long {
        val conId = gasto.copy(id = siguienteId++)
        items.add(conId)
        flujo.value = items.toList()
        return conId.id
    }

    override suspend fun eliminar(gasto: Gasto) {
        items.removeAll { it.id == gasto.id }
        flujo.value = items.toList()
    }

    override fun observarTodos(): StateFlow<List<Gasto>> = flujo

    override suspend fun obtenerTodosOrdenAsc(): List<Gasto> = items.sortedBy { it.fecha }

    override suspend fun sumaEntreFechas(desde: LocalDate, hasta: LocalDate): Double =
        items.filter { !it.fecha.isBefore(desde) && !it.fecha.isAfter(hasta) }.sumOf { it.monto }
}

class FakeGastoFijoDao : GastoFijoDao {
    private val items = mutableListOf<GastoFijo>()
    private var siguienteId = 1L
    private val flujo = MutableStateFlow<List<GastoFijo>>(emptyList())

    override suspend fun insertarTodos(gastosFijos: List<GastoFijo>) {
        gastosFijos.forEach { items.add(it.copy(id = siguienteId++)) }
        flujo.value = items.toList()
    }

    override suspend fun actualizar(gastoFijo: GastoFijo) {
        val indice = items.indexOfFirst { it.id == gastoFijo.id }
        if (indice >= 0) items[indice] = gastoFijo
        flujo.value = items.toList()
    }

    override fun observarTodos(): StateFlow<List<GastoFijo>> = flujo

    override suspend fun obtenerActivos(): List<GastoFijo> = items.filter { it.activo }

    override suspend fun contar(): Int = items.size
}

class FakeConfiguracionDao(inicial: Configuracion? = null) : ConfiguracionDao {
    private val flujo = MutableStateFlow(inicial)

    override suspend fun guardar(configuracion: Configuracion) {
        flujo.value = configuracion
    }

    override fun observar(): StateFlow<Configuracion?> = flujo

    override suspend fun obtener(): Configuracion? = flujo.value

    override suspend fun contar(): Int = if (flujo.value == null) 0 else 1
}
