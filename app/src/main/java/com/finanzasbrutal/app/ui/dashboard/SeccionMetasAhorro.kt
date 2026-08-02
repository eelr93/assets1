package com.finanzasbrutal.app.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.finanzasbrutal.app.data.local.entity.MetaAhorro
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.components.EstadoVacio
import com.finanzasbrutal.app.ui.theme.VerdeAhorro
import com.finanzasbrutal.app.util.CurrencyUtils
import kotlin.math.roundToInt

@Composable
fun SeccionMetasAhorro(repository: FinanzasRepository, modifier: Modifier = Modifier) {
    val viewModel: MetasAhorroViewModel = viewModel(
        factory = FinanzasViewModelFactory { MetasAhorroViewModel(repository) }
    )
    val metas by viewModel.metas.collectAsStateWithLifecycle()
    var mostrarDialogoNueva by remember { mutableStateOf(false) }
    var metaAportando by remember { mutableStateOf<MetaAhorro?>(null) }

    Column(modifier) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Metas de ahorro", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            IconButton(onClick = { mostrarDialogoNueva = true }) {
                Icon(Icons.Filled.Add, contentDescription = "Nueva meta de ahorro")
            }
        }
        Spacer(Modifier.height(8.dp))

        if (metas.isEmpty()) {
            EstadoVacio("Todavía no creaste ninguna meta")
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                metas.forEach { meta ->
                    TarjetaMeta(
                        meta = meta,
                        onAportar = { metaAportando = meta },
                        onEliminar = { viewModel.eliminar(meta) }
                    )
                }
            }
        }
    }

    if (mostrarDialogoNueva) {
        DialogoNuevaMeta(
            onDismiss = { mostrarDialogoNueva = false },
            onConfirmar = { nombre, monto ->
                viewModel.agregarMeta(nombre, monto)
                mostrarDialogoNueva = false
            }
        )
    }

    metaAportando?.let { meta ->
        DialogoAportar(
            meta = meta,
            onDismiss = { metaAportando = null },
            onConfirmar = { monto ->
                viewModel.aportar(meta, monto)
                metaAportando = null
            }
        )
    }
}

@Composable
private fun TarjetaMeta(meta: MetaAhorro, onAportar: () -> Unit, onEliminar: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(meta.nombre, fontWeight = FontWeight.Medium)
                    Text(
                        "${CurrencyUtils.formatear(meta.montoAportado)} de ${CurrencyUtils.formatear(meta.montoObjetivo)}" +
                            if (meta.completada) " · ¡Completa!" else "",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (!meta.completada) {
                    TextButton(onClick = onAportar) { Text("Aportar") }
                }
                IconButton(onClick = onEliminar) {
                    Icon(Icons.Filled.Delete, contentDescription = "Eliminar meta ${meta.nombre}")
                }
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = meta.progreso,
                modifier = Modifier.fillMaxWidth(),
                color = VerdeAhorro
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "${(meta.progreso * 100).roundToInt()}%",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun DialogoNuevaMeta(onDismiss: () -> Unit, onConfirmar: (String, Double) -> Unit) {
    var nombre by remember { mutableStateOf("") }
    var monto by remember { mutableStateOf("") }
    val montoValido = (CurrencyUtils.aMontoOrNull(monto) ?: 0.0) > 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nueva meta de ahorro") },
        text = {
            Column {
                OutlinedTextField(
                    value = nombre,
                    onValueChange = { nombre = it },
                    label = { Text("Nombre (ej. Vacaciones)") },
                    singleLine = true
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = monto,
                    onValueChange = { monto = it },
                    label = { Text("Monto objetivo (ARS)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = nombre.isNotBlank() && montoValido,
                onClick = { onConfirmar(nombre, CurrencyUtils.aMontoOrNull(monto) ?: 0.0) }
            ) { Text("Crear") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

@Composable
private fun DialogoAportar(meta: MetaAhorro, onDismiss: () -> Unit, onConfirmar: (Double) -> Unit) {
    var monto by remember { mutableStateOf("") }
    val montoValido = (CurrencyUtils.aMontoOrNull(monto) ?: 0.0) > 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Aportar a \"${meta.nombre}\"") },
        text = {
            OutlinedTextField(
                value = monto,
                onValueChange = { monto = it },
                label = { Text("Monto (ARS)") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )
        },
        confirmButton = {
            TextButton(
                enabled = montoValido,
                onClick = { onConfirmar(CurrencyUtils.aMontoOrNull(monto) ?: 0.0) }
            ) { Text("Aportar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}
