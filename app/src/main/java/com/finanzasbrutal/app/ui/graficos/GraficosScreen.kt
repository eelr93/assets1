package com.finanzasbrutal.app.ui.graficos

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
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.components.GraficoComparativo
import com.finanzasbrutal.app.ui.components.GraficoLineaAhorro
import com.finanzasbrutal.app.ui.components.GraficoPastelCategorias

@Composable
fun GraficosScreen(repository: FinanzasRepository) {
    val viewModel: GraficosViewModel = viewModel(
        factory = FinanzasViewModelFactory { GraficosViewModel(repository) }
    )
    val estado by viewModel.uiState.collectAsStateWithLifecycle()
    var vistaSemanal by remember { mutableStateOf(true) }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Gráficos", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))

        SeccionCard(titulo = "Evolución del ahorro") {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = vistaSemanal, onClick = { vistaSemanal = true }, label = { Text("Semanal") })
                FilterChip(selected = !vistaSemanal, onClick = { vistaSemanal = false }, label = { Text("Mensual") })
            }
            Spacer(Modifier.height(12.dp))
            GraficoLineaAhorro(
                puntos = if (vistaSemanal) estado.historialSemanal else estado.historialMensual,
                modifier = Modifier.fillMaxWidth()
            )
        }
        Spacer(Modifier.height(16.dp))

        SeccionCard(titulo = "Distribución de gastos (mes actual)") {
            GraficoPastelCategorias(estado.distribucionCategorias, modifier = Modifier.fillMaxWidth())
        }
        Spacer(Modifier.height(16.dp))

        SeccionCard(titulo = "Ingreso vs gasto (últimos 6 meses)") {
            GraficoComparativo(estado.historialMensual, modifier = Modifier.fillMaxWidth())
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SeccionCard(titulo: String, contenido: @Composable () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(titulo, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            contenido()
        }
    }
}
