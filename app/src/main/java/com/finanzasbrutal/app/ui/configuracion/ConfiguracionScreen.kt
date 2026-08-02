package com.finanzasbrutal.app.ui.configuracion

import android.content.Intent
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
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.components.DialogoEditarGastoFijo
import com.finanzasbrutal.app.ui.components.FilaGastoFijo
import com.finanzasbrutal.app.ui.components.SelectorDesplegable
import com.finanzasbrutal.app.util.CurrencyUtils
import com.finanzasbrutal.app.util.DateUtils
import com.finanzasbrutal.app.util.ExportUtils
import kotlinx.coroutines.launch
import java.time.DayOfWeek

@Composable
fun ConfiguracionScreen(repository: FinanzasRepository) {
    val viewModel: ConfiguracionViewModel = viewModel(
        factory = FinanzasViewModelFactory { ConfiguracionViewModel(repository) }
    )
    val estado by viewModel.uiState.collectAsStateWithLifecycle()
    var gastoFijoEditando by remember { mutableStateOf<GastoFijo?>(null) }
    var mostrarDialogoPin by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

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

        SeccionConfiguracion("Seguridad") {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Bloqueo con PIN o huella/rostro")
                    Text(
                        "Pide autenticarte cada vez que abrís la app",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Switch(
                    checked = estado.configuracion.bloqueoActivo,
                    onCheckedChange = { activar ->
                        if (activar) mostrarDialogoPin = true else viewModel.desactivarBloqueo()
                    }
                )
            }
            if (estado.configuracion.bloqueoActivo) {
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = { mostrarDialogoPin = true }) { Text("Cambiar PIN") }
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
        Spacer(Modifier.height(16.dp))

        SeccionConfiguracion("Exportar datos") {
            Text(
                "Genera un CSV con todo el historial de ingresos y gastos para guardarlo o compartirlo.",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = {
                    scope.launch {
                        val archivo = ExportUtils.exportarCsv(context, estado.ingresos, estado.gastos)
                        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", archivo)
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/csv"
                            putExtra(Intent.EXTRA_STREAM, uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        }
                        context.startActivity(Intent.createChooser(intent, "Exportar datos de FinanzasBrutal"))
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) { Text("Exportar CSV") }
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

    if (mostrarDialogoPin) {
        DialogoConfigurarPin(
            onDismiss = { mostrarDialogoPin = false },
            onConfirmar = { pin ->
                viewModel.activarBloqueo(pin)
                mostrarDialogoPin = false
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

@Composable
private fun DialogoConfigurarPin(
    onDismiss: () -> Unit,
    onConfirmar: (String) -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var confirmacion by remember { mutableStateOf("") }
    val pinValido = pin.length in 4..6 && pin.all { it.isDigit() }
    val coinciden = pin == confirmacion

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Configurar PIN") },
        text = {
            Column {
                Text(
                    "Elegí un PIN de 4 a 6 dígitos",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = pin,
                    onValueChange = { if (it.length <= 6) pin = it.filter { c -> c.isDigit() } },
                    label = { Text("PIN") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword)
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = confirmacion,
                    onValueChange = { if (it.length <= 6) confirmacion = it.filter { c -> c.isDigit() } },
                    label = { Text("Confirmar PIN") },
                    singleLine = true,
                    isError = confirmacion.isNotEmpty() && !coinciden,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword)
                )
                if (confirmacion.isNotEmpty() && !coinciden) {
                    Text(
                        "Los PIN no coinciden",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = pinValido && coinciden,
                onClick = { onConfirmar(pin) }
            ) { Text("Guardar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

@Composable
private fun SelectorDiaCorte(diaSeleccionado: Int, onSeleccionar: (Int) -> Unit) {
    SelectorDesplegable(
        valorSeleccionado = DateUtils.NOMBRES_DIA[diaSeleccionado - 1],
        etiqueta = "Día de corte para el ingreso semanal",
        opciones = DayOfWeek.values().toList(),
        etiquetaDe = { DateUtils.NOMBRES_DIA[it.value - 1] },
        onSeleccionar = { onSeleccionar(it.value) },
        modifier = Modifier.fillMaxWidth()
    )
}
