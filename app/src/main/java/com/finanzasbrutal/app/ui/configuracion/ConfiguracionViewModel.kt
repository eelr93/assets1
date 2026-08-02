package com.finanzasbrutal.app.ui.configuracion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.local.entity.Configuracion
import com.finanzasbrutal.app.data.local.entity.ConfiguracionPorDefecto
import com.finanzasbrutal.app.data.local.entity.Gasto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.local.entity.Ingreso
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.util.SeguridadUtils
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ConfiguracionUiState(
    val configuracion: Configuracion = ConfiguracionPorDefecto.crear(),
    val gastosFijos: List<GastoFijo> = emptyList(),
    val ingresos: List<Ingreso> = emptyList(),
    val gastos: List<Gasto> = emptyList()
)

class ConfiguracionViewModel(private val repository: FinanzasRepository) : ViewModel() {

    val uiState: StateFlow<ConfiguracionUiState> = combine(
        repository.observarConfiguracion(),
        repository.observarGastosFijos(),
        repository.observarIngresos(),
        repository.observarGastos()
    ) { configuracion, gastosFijos, ingresos, gastos ->
        ConfiguracionUiState(configuracion, gastosFijos, ingresos, gastos)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConfiguracionUiState())

    fun actualizarMetaAhorro(meta: Double) = guardar { it.copy(metaAhorroMensual = meta) }

    fun actualizarIngresoSemanal(monto: Double) = guardar { it.copy(ingresoSemanalAuto = monto) }

    fun actualizarDiaCorte(diaIso: Int) = guardar { it.copy(diaCorteIngreso = diaIso) }

    fun actualizarNotificaciones(activas: Boolean) = guardar { it.copy(notificacionesActivas = activas) }

    fun actualizarUmbralAlerta(porcentaje: Double) = guardar { it.copy(umbralAlertaPorcentaje = porcentaje) }

    fun actualizarGastoFijo(gastoFijo: GastoFijo) {
        viewModelScope.launch { repository.actualizarGastoFijo(gastoFijo) }
    }

    fun activarBloqueo(pin: String) = guardar { it.copy(bloqueoActivo = true, pinHash = SeguridadUtils.hashPin(pin)) }

    fun desactivarBloqueo() = guardar { it.copy(bloqueoActivo = false, pinHash = null) }

    private fun guardar(transformar: (Configuracion) -> Configuracion) {
        viewModelScope.launch {
            repository.actualizarConfiguracion(transformar(uiState.value.configuracion))
        }
    }
}
