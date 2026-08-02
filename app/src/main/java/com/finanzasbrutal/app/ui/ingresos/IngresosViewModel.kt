package com.finanzasbrutal.app.ui.ingresos

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.local.entity.Ingreso
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

class IngresosViewModel(private val repository: FinanzasRepository) : ViewModel() {

    val ingresos: StateFlow<List<Ingreso>> = repository.observarIngresos()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun agregarIngreso(monto: Double, descripcion: String, fecha: LocalDate) {
        viewModelScope.launch {
            repository.registrarIngresoManual(monto, descripcion, fecha)
        }
    }

    fun eliminarIngreso(ingreso: Ingreso) {
        viewModelScope.launch { repository.eliminarIngreso(ingreso) }
    }
}
