package com.finanzasbrutal.app.ui.bloqueo

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.local.entity.Configuracion
import com.finanzasbrutal.app.data.local.entity.ConfiguracionPorDefecto
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class BloqueoViewModel(repository: FinanzasRepository) : ViewModel() {
    val configuracion: StateFlow<Configuracion> = repository.observarConfiguracion()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConfiguracionPorDefecto.crear())
}
