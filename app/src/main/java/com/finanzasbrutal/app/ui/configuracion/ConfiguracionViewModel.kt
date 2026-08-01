package com.finanzasbrutal.app.ui.configuracion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.local.entity.Configuracion
import com.finanzasbrutal.app.data.local.entity.ConfiguracionPorDefecto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ConfiguracionUiState(
    val configuracion: Configuracion = ConfiguracionPorDefecto.crear(),
    val gastosFijos: List<GastoFijo> = emptyList()
)

class ConfiguracionViewModel(private val repository: FinanzasRepository) : ViewModel() {

    val uiState: StateFlow<ConfiguracionUiState> = combine(
        repository.observarConfiguracion(),
        repository.observarGastosFijos()
    ) { configuracion, gastosFijos ->
        ConfiguracionUiState(configuracion, gastosFijos)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConfiguracionUiState())

    fun actualizarMetaAhorro(meta: Double) = guardar { it.copy(metaAhorroMensual = meta) }

    fun actualizarIngresoSemanal(monto: Double) = guardar { it.copy(ingresoSemanalAuto = monto) }

    fun actualizarDiaCorte(diaIso: Int) = guardar { it.copy(diaCorteIngreso = diaIso) }

    fun actualizarNotificaciones(activas: Boolean) = guardar { it.copy(notificacionesActivas = activas) }

    fun actualizarGastoFijo(gastoFijo: GastoFijo) {
        viewModelScope.launch { repository.actualizarGastoFijo(gastoFijo) }
    }

    private fun guardar(transformar: (Configuracion) -> Configuracion) {
        viewModelScope.launch {
            repository.actualizarConfiguracion(transformar(uiState.value.configuracion))
        }
    }
}
