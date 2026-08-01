package com.finanzasbrutal.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.ui.theme.colorDeCategoria
import com.finanzasbrutal.app.util.CurrencyUtils

@Composable
fun FilaGastoFijo(gastoFijo: GastoFijo, onEditar: () -> Unit, modifier: Modifier = Modifier) {
    Card(modifier.fillMaxWidth()) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(gastoFijo.nombre, fontWeight = FontWeight.Medium)
                val restantes = gastoFijo.mesesRestantes()
                val detalle = buildString {
                    append(gastoFijo.categoria.etiqueta)
                    if (!gastoFijo.activo) append(" · inactivo")
                    if (restantes != null) append(" · quedan $restantes cuota(s)")
                }
                Text(detalle, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                CurrencyUtils.formatear(gastoFijo.monto),
                color = colorDeCategoria(gastoFijo.categoria),
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = onEditar) {
                Icon(Icons.Filled.Edit, contentDescription = "Editar ${gastoFijo.nombre}")
            }
        }
    }
}

@Composable
fun DialogoEditarGastoFijo(
    gastoFijo: GastoFijo,
    onDismiss: () -> Unit,
    onGuardar: (GastoFijo) -> Unit
) {
    var monto by remember { mutableStateOf(gastoFijo.monto.toInt().toString()) }
    var activo by remember { mutableStateOf(gastoFijo.activo) }
    val montoValido = (CurrencyUtils.aMontoOrNull(monto) ?: 0.0) > 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(gastoFijo.nombre) },
        text = {
            Column {
                OutlinedTextField(
                    value = monto,
                    onValueChange = { monto = it },
                    label = { Text("Monto mensual (ARS)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                )
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Activo", modifier = Modifier.weight(1f))
                    Switch(checked = activo, onCheckedChange = { activo = it })
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = montoValido,
                onClick = {
                    onGuardar(
                        gastoFijo.copy(
                            monto = CurrencyUtils.aMontoOrNull(monto) ?: gastoFijo.monto,
                            activo = activo
                        )
                    )
                }
            ) { Text("Guardar") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}
