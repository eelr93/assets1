package com.finanzasbrutal.app.ui.gastos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.local.entity.Gasto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

/** Un producto agregado en una sesión de "lista de compras" todavía no guardado como gasto. */
data class ItemListaCompras(val id: Long, val nombre: String, val precio: Double)

class GastosViewModel(private val repository: FinanzasRepository) : ViewModel() {

    private val _filtroCategoria = MutableStateFlow<CategoriaGasto?>(null)
    val filtroCategoria: StateFlow<CategoriaGasto?> = _filtroCategoria

    val gastosFijos: StateFlow<List<GastoFijo>> = repository.observarGastosFijos()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val saldoActual: StateFlow<Double> = repository.observarSaldoActual()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0.0)

    private val _itemsListaCompras = MutableStateFlow<List<ItemListaCompras>>(emptyList())
    val itemsListaCompras: StateFlow<List<ItemListaCompras>> = _itemsListaCompras
    private var siguienteIdItemLista = 0L

    val gastosVariablesFiltrados: StateFlow<List<Gasto>> = combine(
        repository.observarGastos(),
        _filtroCategoria
    ) { gastos, filtro ->
        gastos.filter { filtro == null || it.categoria == filtro }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun establecerFiltro(categoria: CategoriaGasto?) {
        _filtroCategoria.value = categoria
    }

    fun agregarGastoVariable(monto: Double, descripcion: String, categoria: CategoriaGasto, fecha: LocalDate) {
        viewModelScope.launch { repository.registrarGasto(monto, descripcion, categoria, fecha) }
    }

    fun eliminarGasto(gasto: Gasto) {
        viewModelScope.launch { repository.eliminarGasto(gasto) }
    }

    fun actualizarGastoFijo(gastoFijo: GastoFijo) {
        viewModelScope.launch { repository.actualizarGastoFijo(gastoFijo) }
    }

    fun agregarItemLista(nombre: String, precio: Double) {
        _itemsListaCompras.update { it + ItemListaCompras(siguienteIdItemLista++, nombre, precio) }
    }

    fun quitarItemLista(id: Long) {
        _itemsListaCompras.update { lista -> lista.filterNot { it.id == id } }
    }

    fun cancelarListaCompras() {
        _itemsListaCompras.value = emptyList()
    }

    fun confirmarListaCompras(categoria: CategoriaGasto) {
        val items = _itemsListaCompras.value
        if (items.isEmpty()) return
        viewModelScope.launch {
            items.forEach { item ->
                repository.registrarGasto(item.precio, item.nombre, categoria, LocalDate.now())
            }
            _itemsListaCompras.value = emptyList()
        }
    }
}
