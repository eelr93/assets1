package com.finanzasbrutal.app.ui.configuracion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Card
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenu
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.components.DialogoEditarGastoFijo
import com.finanzasbrutal.app.ui.components.FilaGastoFijo
import com.finanzasbrutal.app.util.CurrencyUtils
import com.finanzasbrutal.app.util.DateUtils
import java.time.DayOfWeek

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfiguracionScreen(repository: FinanzasRepository) {
    val viewModel: ConfiguracionViewModel = viewModel(
        factory = FinanzasViewModelFactory { ConfiguracionViewModel(repository) }
    )
    val estado by viewModel.uiState.collectAsStateWithLifecycle()
    var gastoFijoEditando by remember { mutableStateOf<GastoFijo?>(null) }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("Ajustes", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))

        SeccionConfiguracion("Ingreso semanal automático") {
            CampoMontoConGuardar(
                valorInicial = estado.configuracion.ingresoSemanalAuto,
                etiqueta = "Monto por semana (ARS)",
                onGuardar = viewModel::actualizarIngresoSemanal
            )
            Spacer(Modifier.height(12.dp))
            SelectorDiaCorte(
                diaSeleccionado = estado.configuracion.diaCorteIngreso,
                onSeleccionar = viewModel::actualizarDiaCorte
            )
        }
        Spacer(Modifier.height(16.dp))

        SeccionConfiguracion("Meta de ahorro mensual") {
            CampoMontoConGuardar(
                valorInicial = estado.configuracion.metaAhorroMensual,
                etiqueta = "Meta (ARS)",
                onGuardar = viewModel::actualizarMetaAhorro
            )
        }
        Spacer(Modifier.height(16.dp))

        SeccionConfiguracion("Notificaciones") {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Recordatorios y alertas activas", modifier = Modifier.weight(1f))
                Switch(
                    checked = estado.configuracion.notificacionesActivas,
                    onCheckedChange = viewModel::actualizarNotificaciones
                )
            }
        }
        Spacer(Modifier.height(16.dp))

        SeccionConfiguracion("Gastos fijos") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                estado.gastosFijos.forEach { gastoFijo ->
                    FilaGastoFijo(gastoFijo, onEditar = { gastoFijoEditando = gastoFijo })
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }

    gastoFijoEditando?.let { gastoFijo ->
        DialogoEditarGastoFijo(
            gastoFijo = gastoFijo,
            onDismiss = { gastoFijoEditando = null },
            onGuardar = {
                viewModel.actualizarGastoFijo(it)
                gastoFijoEditando = null
            }
        )
    }
}

@Composable
private fun SeccionConfiguracion(titulo: String, contenido: @Composable () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text(titulo, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            contenido()
        }
    }
}

@Composable
private fun CampoMontoConGuardar(
    valorInicial: Double,
    etiqueta: String,
    onGuardar: (Double) -> Unit
) {
    var texto by remember(valorInicial) { mutableStateOf(valorInicial.toInt().toString()) }
    val montoValido = (CurrencyUtils.aMontoOrNull(texto) ?: 0.0) > 0.0

    OutlinedTextField(
        value = texto,
        onValueChange = { texto = it },
        label = { Text(etiqueta) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        trailingIcon = {
            IconButton(
                enabled = montoValido,
                onClick = { CurrencyUtils.aMontoOrNull(texto)?.let(onGuardar) }
            ) {
                Icon(Icons.Filled.Check, contentDescription = "Guardar")
            }
        },
        modifier = Modifier.fillMaxWidth()
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelectorDiaCorte(diaSeleccionado: Int, onSeleccionar: (Int) -> Unit) {
    var menuAbierto by remember { mutableStateOf(false) }
    val nombreActual = DateUtils.NOMBRES_DIA[diaSeleccionado - 1]

    ExposedDropdownMenuBox(expanded = menuAbierto, onExpandedChange = { menuAbierto = it }) {
        OutlinedTextField(
            value = nombreActual,
            onValueChange = {},
            readOnly = true,
            label = { Text("Día de corte para el ingreso semanal") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = menuAbierto) },
            modifier = Modifier.menuAnchor().fillMaxWidth()
        )
        ExposedDropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
            DayOfWeek.values().forEach { dia ->
                DropdownMenuItem(
                    text = { Text(DateUtils.NOMBRES_DIA[dia.value - 1]) },
                    onClick = {
                        onSeleccionar(dia.value)
                        menuAbierto = false
                    }
                )
            }
        }
    }
}
