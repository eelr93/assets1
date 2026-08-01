package com.finanzasbrutal.app.ui.gastos

import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenu
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.local.entity.Gasto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.components.DialogoEditarGastoFijo
import com.finanzasbrutal.app.ui.components.EstadoVacio
import com.finanzasbrutal.app.ui.components.FilaGastoFijo
import com.finanzasbrutal.app.ui.theme.RojoGasto
import com.finanzasbrutal.app.ui.theme.colorDeCategoria
import com.finanzasbrutal.app.util.CurrencyUtils
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun GastosScreen(repository: FinanzasRepository) {
    val viewModel: GastosViewModel = viewModel(
        factory = FinanzasViewModelFactory { GastosViewModel(repository) }
    )
    var pestaniaSeleccionada by remember { mutableIntStateOf(0) }
    var mostrarDialogoNuevo by remember { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            if (pestaniaSeleccionada == 1) {
                FloatingActionButton(onClick = { mostrarDialogoNuevo = true }, containerColor = RojoGasto) {
                    Icon(Icons.Filled.Add, contentDescription = "Agregar gasto")
                }
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(16.dp))
            Text("Gastos", style = MaterialTheme.typography.headlineMedium)
            Spacer(Modifier.height(12.dp))

            TabRow(selectedTabIndex = pestaniaSeleccionada) {
                Tab(
                    selected = pestaniaSeleccionada == 0,
                    onClick = { pestaniaSeleccionada = 0 },
                    text = { Text("Fijos") }
                )
                Tab(
                    selected = pestaniaSeleccionada == 1,
                    onClick = { pestaniaSeleccionada = 1 },
                    text = { Text("Variables") }
                )
            }
            Spacer(Modifier.height(12.dp))

            if (pestaniaSeleccionada == 0) {
                PanelGastosFijos(viewModel)
            } else {
                PanelGastosVariables(viewModel)
            }
        }
    }

    if (mostrarDialogoNuevo) {
        DialogoNuevoGasto(
            onDismiss = { mostrarDialogoNuevo = false },
            onConfirmar = { monto, descripcion, categoria, fecha ->
                viewModel.agregarGastoVariable(monto, descripcion, categoria, fecha)
                mostrarDialogoNuevo = false
            }
        )
    }
}

@Composable
private fun PanelGastosFijos(viewModel: GastosViewModel) {
    val gastosFijos by viewModel.gastosFijos.collectAsStateWithLifecycle()
    var gastoFijoEditando by remember { mutableStateOf<GastoFijo?>(null) }

    if (gastosFijos.isEmpty()) {
        EstadoVacio("No hay gastos fijos configurados")
        return
    }

    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(gastosFijos, key = { it.id }) { gastoFijo ->
            FilaGastoFijo(gastoFijo, onEditar = { gastoFijoEditando = gastoFijo })
        }
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
private fun PanelGastosVariables(viewModel: GastosViewModel) {
    val gastos by viewModel.gastosVariablesFiltrados.collectAsStateWithLifecycle()
    val filtro by viewModel.filtroCategoria.collectAsStateWithLifecycle()

    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        FilterChip(
            selected = filtro == null,
            onClick = { viewModel.establecerFiltro(null) },
            label = { Text("Todas") }
        )
        CategoriaGasto.entries.forEach { categoria ->
            FilterChip(
                selected = filtro == categoria,
                onClick = { viewModel.establecerFiltro(if (filtro == categoria) null else categoria) },
                label = { Text(categoria.etiqueta) }
            )
        }
    }
    Spacer(Modifier.height(12.dp))

    Text(
        "Total: ${CurrencyUtils.formatear(gastos.sumOf { it.monto })}",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant
    )
    Spacer(Modifier.height(12.dp))

    if (gastos.isEmpty()) {
        EstadoVacio("No hay gastos registrados con este filtro")
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(gastos, key = { it.id }) { gasto ->
                FilaGastoVariable(gasto, onEliminar = { viewModel.eliminarGasto(gasto) })
            }
        }
    }
}

@Composable
private fun FilaGastoVariable(gasto: Gasto, onEliminar: () -> Unit) {
    Card(
        Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = colorDeCategoria(gasto.categoria).copy(alpha = 0.08f))
    ) {
        Row(
            Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(gasto.descripcion, fontWeight = FontWeight.Medium)
                Text(
                    "${gasto.fecha.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))} · ${gasto.categoria.etiqueta}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Text(
                CurrencyUtils.formatear(gasto.monto),
                color = colorDeCategoria(gasto.categoria),
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = onEliminar) {
                Icon(Icons.Filled.Delete, contentDescription = "Eliminar gasto")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DialogoNuevoGasto(
    onDismiss: () -> Unit,
    onConfirmar: (Double, String, CategoriaGasto, LocalDate) -> Unit
) {
    var monto by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    var categoria by remember { mutableStateOf(CategoriaGasto.COMIDA) }
    var menuAbierto by remember { mutableStateOf(false) }
    val montoValido = (CurrencyUtils.aMontoOrNull(monto) ?: 0.0) > 0.0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Nuevo gasto") },
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
                Spacer(Modifier.height(8.dp))
                ExposedDropdownMenuBox(expanded = menuAbierto, onExpandedChange = { menuAbierto = it }) {
                    OutlinedTextField(
                        value = categoria.etiqueta,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Categoría") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = menuAbierto) },
                        modifier = Modifier.menuAnchor().fillMaxWidth()
                    )
                    ExposedDropdownMenu(expanded = menuAbierto, onDismissRequest = { menuAbierto = false }) {
                        CategoriaGasto.entries.forEach { opcion ->
                            DropdownMenuItem(
                                text = { Text(opcion.etiqueta) },
                                onClick = {
                                    categoria = opcion
                                    menuAbierto = false
                                }
                            )
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = montoValido,
                onClick = {
                    onConfirmar(
                        CurrencyUtils.aMontoOrNull(monto) ?: 0.0,
                        descripcion.ifBlank { categoria.etiqueta },
                        categoria,
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
