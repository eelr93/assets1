package com.finanzasbrutal.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.local.entity.MetaAhorro
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MetasAhorroViewModel(private val repository: FinanzasRepository) : ViewModel() {

    val metas: StateFlow<List<MetaAhorro>> = repository.observarMetasAhorro()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun agregarMeta(nombre: String, montoObjetivo: Double) {
        viewModelScope.launch { repository.agregarMetaAhorro(nombre, montoObjetivo) }
    }

    fun aportar(meta: MetaAhorro, monto: Double) {
        viewModelScope.launch { repository.aportarAMeta(meta, monto) }
    }

    fun eliminar(meta: MetaAhorro) {
        viewModelScope.launch { repository.eliminarMetaAhorro(meta) }
    }
}
