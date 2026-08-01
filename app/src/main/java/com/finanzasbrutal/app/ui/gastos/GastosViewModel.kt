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
import kotlinx.coroutines.launch
import java.time.LocalDate

class GastosViewModel(private val repository: FinanzasRepository) : ViewModel() {

    private val _filtroCategoria = MutableStateFlow<CategoriaGasto?>(null)
    val filtroCategoria: StateFlow<CategoriaGasto?> = _filtroCategoria

    val gastosFijos: StateFlow<List<GastoFijo>> = repository.observarGastosFijos()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

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
}
