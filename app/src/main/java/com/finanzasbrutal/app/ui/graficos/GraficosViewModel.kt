package com.finanzasbrutal.app.ui.graficos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.data.repository.PuntoHistorial
import com.finanzasbrutal.app.util.DateUtils
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate

data class GraficosUiState(
    val historialSemanal: List<PuntoHistorial> = emptyList(),
    val historialMensual: List<PuntoHistorial> = emptyList(),
    val distribucionCategorias: Map<CategoriaGasto, Double> = emptyMap()
)

class GraficosViewModel(repository: FinanzasRepository) : ViewModel() {

    val uiState: StateFlow<GraficosUiState> = combine(
        repository.observarIngresos(),
        repository.observarGastos()
    ) { _, _ ->
        val hoy = LocalDate.now()
        GraficosUiState(
            historialSemanal = repository.historialSemanal(8, hoy),
            historialMensual = repository.historialMensual(6, hoy),
            distribucionCategorias = repository.distribucionGastosPorCategoria(
                DateUtils.inicioMes(hoy),
                DateUtils.finMes(hoy)
            )
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), GraficosUiState())
}
