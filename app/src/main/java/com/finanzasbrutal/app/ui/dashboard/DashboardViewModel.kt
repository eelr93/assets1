package com.finanzasbrutal.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.data.repository.SEMANAS_POR_MES
import com.finanzasbrutal.app.util.DateUtils
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import java.time.DayOfWeek
import java.time.LocalDate

data class DashboardUiState(
    val cargando: Boolean = true,
    val saldoActual: Double = 0.0,
    val ingresoHoy: Double = 0.0,
    val ingresoSemana: Double = 0.0,
    val ingresoMes: Double = 0.0,
    val ingresoAnio: Double = 0.0,
    val gastoHoy: Double = 0.0,
    val gastoSemana: Double = 0.0,
    val gastoMes: Double = 0.0,
    val gastoAnio: Double = 0.0,
    val metaAhorroMensual: Double = 0.0,
    val proyeccionAhorroMensual: Double = 0.0,
    val proyeccionAhorroAnual: Double = 0.0,
    val margenDisponible: Double = 0.0,
    val alertaGastosExcedidos: Boolean = false,
    val gastoMesAnterior: Double = 0.0,
    val ahorroMesActual: Double = 0.0,
    val ahorroMesAnterior: Double = 0.0
)

class DashboardViewModel(repository: FinanzasRepository) : ViewModel() {

    val uiState: StateFlow<DashboardUiState> = combine(
        repository.observarIngresos(),
        repository.observarGastos(),
        repository.observarGastosFijos(),
        repository.observarConfiguracion()
    ) { ingresos, gastos, gastosFijos, config ->
        val hoy = LocalDate.now()
        val inicioSemana = DateUtils.inicioSemana(hoy, DayOfWeek.of(config.diaCorteIngreso))
        val inicioMes = DateUtils.inicioMes(hoy)
        val inicioAnio = DateUtils.inicioAnio(hoy)
        val inicioMesAnterior = inicioMes.minusMonths(1)
        val finMesAnterior = inicioMes.minusDays(1)

        val ingresoTotal = ingresos.sumOf { it.monto }
        val gastoTotal = gastos.sumOf { it.monto }

        val ingresoMensualEstimado = config.ingresoSemanalAuto * SEMANAS_POR_MES
        val totalGastosFijos = gastosFijos.filter { it.activo }.sumOf { it.monto }
        val proyeccionAhorroMensual = ingresoMensualEstimado - totalGastosFijos
        val ingresoMesActual = ingresos.filter { !it.fecha.isBefore(inicioMes) }.sumOf { it.monto }
        val gastoMesActual = gastos.filter { !it.fecha.isBefore(inicioMes) }.sumOf { it.monto }
        val gastoVariableMes = (gastoMesActual - totalGastosFijos).coerceAtLeast(0.0)

        val ingresoMesAnterior = ingresos
            .filter { !it.fecha.isBefore(inicioMesAnterior) && !it.fecha.isAfter(finMesAnterior) }
            .sumOf { it.monto }
        val gastoMesAnterior = gastos
            .filter { !it.fecha.isBefore(inicioMesAnterior) && !it.fecha.isAfter(finMesAnterior) }
            .sumOf { it.monto }

        DashboardUiState(
            cargando = false,
            saldoActual = ingresoTotal - gastoTotal,
            ingresoHoy = ingresos.filter { it.fecha == hoy }.sumOf { it.monto },
            ingresoSemana = ingresos.filter { !it.fecha.isBefore(inicioSemana) }.sumOf { it.monto },
            ingresoMes = ingresoMesActual,
            ingresoAnio = ingresos.filter { !it.fecha.isBefore(inicioAnio) }.sumOf { it.monto },
            gastoHoy = gastos.filter { it.fecha == hoy }.sumOf { it.monto },
            gastoSemana = gastos.filter { !it.fecha.isBefore(inicioSemana) }.sumOf { it.monto },
            gastoMes = gastoMesActual,
            gastoAnio = gastos.filter { !it.fecha.isBefore(inicioAnio) }.sumOf { it.monto },
            metaAhorroMensual = config.metaAhorroMensual,
            proyeccionAhorroMensual = proyeccionAhorroMensual,
            proyeccionAhorroAnual = proyeccionAhorroMensual * 12,
            margenDisponible = proyeccionAhorroMensual - gastoVariableMes,
            alertaGastosExcedidos = ingresoMensualEstimado > 0 &&
                gastoMesActual >= config.umbralAlertaPorcentaje * ingresoMensualEstimado,
            gastoMesAnterior = gastoMesAnterior,
            ahorroMesActual = ingresoMesActual - gastoMesActual,
            ahorroMesAnterior = ingresoMesAnterior - gastoMesAnterior
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), DashboardUiState())
}
