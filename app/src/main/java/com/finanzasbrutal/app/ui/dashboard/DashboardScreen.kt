package com.finanzasbrutal.app.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.components.AlertaBanner
import com.finanzasbrutal.app.ui.components.SaldoCard
import com.finanzasbrutal.app.ui.components.StatCard
import com.finanzasbrutal.app.ui.theme.AzulIngreso
import com.finanzasbrutal.app.ui.theme.RojoGasto
import com.finanzasbrutal.app.ui.theme.VerdeAhorro
import com.finanzasbrutal.app.util.CurrencyUtils
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun DashboardScreen(repository: FinanzasRepository) {
    val viewModel: DashboardViewModel = viewModel(
        factory = FinanzasViewModelFactory { DashboardViewModel(repository) }
    )
    val estado by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("FinanzasBrutal", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))

        if (estado.alertaGastosExcedidos) {
            AlertaBanner("Tus gastos superaron el 60% del ingreso mensual estimado")
            Spacer(Modifier.height(12.dp))
        }

        val colorSaldo = if (estado.saldoActual >= 0) VerdeAhorro else RojoGasto
        SaldoCard(
            titulo = "Saldo actual",
            valor = CurrencyUtils.formatear(estado.saldoActual),
            color = colorSaldo
        )
        Spacer(Modifier.height(20.dp))

        SeccionTitulo("Ingresos")
        FilaDosStats("Hoy", estado.ingresoHoy, "Semana", estado.ingresoSemana, AzulIngreso)
        Spacer(Modifier.height(8.dp))
        FilaDosStats("Mes", estado.ingresoMes, "Año", estado.ingresoAnio, AzulIngreso)
        Spacer(Modifier.height(20.dp))

        SeccionTitulo("Gastos")
        FilaDosStats("Hoy", estado.gastoHoy, "Semana", estado.gastoSemana, RojoGasto)
        Spacer(Modifier.height(8.dp))
        FilaDosStats("Mes", estado.gastoMes, "Año", estado.gastoAnio, RojoGasto)
        Spacer(Modifier.height(20.dp))

        SeccionTitulo("Comparado con el mes anterior")
        ComparativaMesCard(
            gastoActual = estado.gastoMes,
            gastoAnterior = estado.gastoMesAnterior,
            ahorroActual = estado.ahorroMesActual,
            ahorroAnterior = estado.ahorroMesAnterior
        )
        Spacer(Modifier.height(20.dp))

        SeccionTitulo("Proyección de ahorro")
        FilaDosStats(
            "Mensual", estado.proyeccionAhorroMensual,
            "Anual", estado.proyeccionAhorroAnual,
            VerdeAhorro
        )
        Spacer(Modifier.height(8.dp))
        StatCard(
            titulo = "Margen disponible",
            valor = CurrencyUtils.formatear(estado.margenDisponible),
            color = if (estado.margenDisponible >= 0) VerdeAhorro else RojoGasto,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Meta de ahorro mensual: ${CurrencyUtils.formatear(estado.metaAhorroMensual)}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(20.dp))

        SeccionMetasAhorro(repository)
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SeccionTitulo(texto: String) {
    Text(texto, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun ComparativaMesCard(
    gastoActual: Double,
    gastoAnterior: Double,
    ahorroActual: Double,
    ahorroAnterior: Double
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            FilaComparativa("Gasto", gastoActual, gastoAnterior, subeEsMalo = true)
            Spacer(Modifier.height(12.dp))
            FilaComparativa("Ahorro", ahorroActual, ahorroAnterior, subeEsMalo = false)
        }
    }
}

@Composable
private fun FilaComparativa(etiqueta: String, actual: Double, anterior: Double, subeEsMalo: Boolean) {
    val variacion = calcularVariacionPorcentual(actual, anterior)
    val subio = variacion != null && variacion > 0
    val colorVariacion = when {
        variacion == null -> MaterialTheme.colorScheme.onSurfaceVariant
        subio == subeEsMalo -> RojoGasto
        else -> VerdeAhorro
    }

    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Column {
            Text(etiqueta, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(CurrencyUtils.formatear(actual), fontWeight = FontWeight.Bold)
        }
        Text(
            text = if (variacion == null) "sin datos del mes anterior" else "${if (subio) "+" else ""}${variacion.roundToInt()}% vs. mes pasado",
            color = colorVariacion,
            style = MaterialTheme.typography.labelMedium
        )
    }
}

private fun calcularVariacionPorcentual(actual: Double, anterior: Double): Double? {
    if (anterior == 0.0) return null
    return (actual - anterior) / abs(anterior) * 100
}

@Composable
private fun FilaDosStats(
    titulo1: String,
    valor1: Double,
    titulo2: String,
    valor2: Double,
    color: androidx.compose.ui.graphics.Color
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        StatCard(titulo1, CurrencyUtils.formatear(valor1), color, Modifier.weight(1f))
        StatCard(titulo2, CurrencyUtils.formatear(valor2), color, Modifier.weight(1f))
    }
}
