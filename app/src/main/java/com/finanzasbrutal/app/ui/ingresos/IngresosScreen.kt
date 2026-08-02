package com.finanzasbrutal.app.ui.ingresos

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import com.finanzasbrutal.app.data.local.entity.Ingreso
import com.finanzasbrutal.app.data.local.entity.TipoIngreso
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.components.EstadoVacio
import com.finanzasbrutal.app.ui.theme.AzulIngreso
import com.finanzasbrutal.app.util.CurrencyUtils
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun IngresosScreen(repository: FinanzasRepository) {
    val viewModel: IngresosViewModel = viewModel(
        factory = FinanzasViewModelFactory { IngresosViewModel(repository) }
    )
    val ingresos by viewModel.ingresos.collectAsStateWithLifecycle()
    var mostrarDialogo by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = { mostrarDialogo = true }, containerColor = AzulIngreso) {
                Icon(Icons.Filled.Add, contentDescription = "Agregar ingreso")
            }
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text("Ingresos", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(4.dp))
            Text(
                "Total histórico: ${CurrencyUtils.formatear(ingresos.sumOf { it.monto })}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(16.dp))

            if (ingresos.isEmpty()) {
                EstadoVacio("Todavía no registraste ingresos")
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(ingresos, key = { it.id }) { ingreso ->
                        FilaIngreso(ingreso, onEliminar = { viewModel.eliminarIngreso(ingreso) })
                    }
                }
            }
        }
    }

    if (mostrarDialogo) {
        DialogoNuevoIngreso(
            onDismiss = { mostrarDialogo = false },
            onConfirmar = { monto, descripcion, fecha ->
                viewModel.agregarIngreso(monto, descripcion, fecha)
                mostrarDialogo = false
            }
        )
    }
}

@Composable
private fun FilaIngreso(ingreso: Ingreso, onEliminar: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(ingreso.descripcion, fontWeight = FontWeight.Medium)
                Text(
                    "${ingreso.fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))} · " +
                        if (ingreso.tipo == TipoIngreso.AUTOMATICO) "Automático" else "Manual",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                CurrencyUtils.formatear(ingreso.monto),
                color = AzulIngreso,
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = onEliminar) {
                Icon(Icons.Filled.Delete, contentDescription = "Eliminar ingreso")
            }
        }
    }
}

@Composable
private fun DialogoNuevoIngreso(
    onDismiss: () -> Unit,
    onConfirmar: (Double, String, LocalDate) -> Unit
) {
    var monto by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    val montoValido = (CurrencyUtils.aMontoOrNull(monto) ?: 0.0) > 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nuevo ingreso") },
        text = {
            Column {
                OutlinedTextField(
                    value = monto,
                    onValueChange = { monto = it },
                    label = { Text("Monto (ARS)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = descripcion,
                    onValueChange = { descripcion = it },
                    label = { Text("Descripción") },
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = montoValido,
                onClick = {
                    onConfirmar(
                        CurrencyUtils.aMontoOrNull(monto) ?: 0.0,
                        descripcion.ifBlank { "Ingreso adicional" },
                        LocalDate.now()
                    )
                }
            ) { Text("Guardar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}
