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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.runtime.saveable.rememberSaveable
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
import com.finanzasbrutal.app.ui.components.SelectorDesplegable
import com.finanzasbrutal.app.ui.theme.RojoGasto
import com.finanzasbrutal.app.ui.theme.VerdeAhorro
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
                Tab(
                    selected = pestaniaSeleccionada == 2,
                    onClick = { pestaniaSeleccionada = 2 },
                    text = { Text("Lista rápida") }
                )
            }
            Spacer(Modifier.height(12.dp))

            when (pestaniaSeleccionada) {
                0 -> PanelGastosFijos(viewModel)
                1 -> PanelGastosVariables(viewModel)
                else -> PanelListaCompras(viewModel)
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

@Composable
private fun PanelListaCompras(viewModel: GastosViewModel) {
    val saldo by viewModel.saldoActual.collectAsStateWithLifecycle()
    val productos by viewModel.itemsListaCompras.collectAsStateWithLifecycle()

    var capitalTexto by rememberSaveable { mutableStateOf<String?>(null) }
    var nombreProducto by remember { mutableStateOf("") }
    var precioProducto by remember { mutableStateOf("") }
    var categoria by remember { mutableStateOf(CategoriaGasto.COMIDA) }

    val capital = capitalTexto?.let { CurrencyUtils.aMontoOrNull(it) } ?: saldo
    val gastado = productos.sumOf { it.precio }
    val disponible = capital - gastado
    val precioValido = (CurrencyUtils.aMontoOrNull(precioProducto) ?: 0.0) > 0.0

    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = capitalTexto ?: capital.toInt().toString(),
            onValueChange = { capitalTexto = it },
            label = { Text("Capital disponible (ARS)") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Por defecto es tu saldo actual (${CurrencyUtils.formatear(saldo)}); podés cambiarlo si llevás menos plata.",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(16.dp))

        SelectorDesplegable(
            valorSeleccionado = categoria.etiqueta,
            etiqueta = "Categoría",
            opciones = CategoriaGasto.entries,
            etiquetaDe = { it.etiqueta },
            onSeleccionar = { categoria = it },
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = nombreProducto,
                onValueChange = { nombreProducto = it },
                label = { Text("Producto") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            OutlinedTextField(
                value = precioProducto,
                onValueChange = { precioProducto = it },
                label = { Text("Precio") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.weight(1f)
            )
        }
        Spacer(Modifier.height(8.dp))
        Button(
            enabled = precioValido,
            onClick = {
                viewModel.agregarItemLista(
                    nombreProducto.ifBlank { "Producto" },
                    CurrencyUtils.aMontoOrNull(precioProducto) ?: 0.0
                )
                nombreProducto = ""
                precioProducto = ""
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Icon(Icons.Filled.Add, contentDescription = null)
            Spacer(Modifier.width(6.dp))
            Text("Agregar a la lista")
        }
        Spacer(Modifier.height(16.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Gastado: ${CurrencyUtils.formatear(gastado)}", color = RojoGasto, fontWeight = FontWeight.Bold)
            Text(
                "Disponible: ${CurrencyUtils.formatear(disponible)}",
                color = if (disponible >= 0) VerdeAhorro else RojoGasto,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(Modifier.height(12.dp))

        if (productos.isEmpty()) {
            EstadoVacio("Todavía no agregaste productos")
        } else {
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                items(productos, key = { it.id }) { item ->
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(item.nombre, modifier = Modifier.weight(1f))
                        Text(CurrencyUtils.formatear(item.precio))
                        IconButton(onClick = { viewModel.quitarItemLista(item.id) }) {
                            Icon(Icons.Filled.Delete, contentDescription = "Quitar ${item.nombre}")
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = { viewModel.cancelarListaCompras() },
                    modifier = Modifier.weight(1f)
                ) { Text("Cancelar") }
                Button(
                    onClick = { viewModel.confirmarListaCompras(categoria) },
                    modifier = Modifier.weight(1f)
                ) { Text("Guardar todo") }
            }
        }
    }
}

@Composable
private fun DialogoNuevoGasto(
    onDismiss: () -> Unit,
    onConfirmar: (Double, String, CategoriaGasto, LocalDate) -> Unit
) {
    var monto by remember { mutableStateOf("") }
    var descripcion by remember { mutableStateOf("") }
    var categoria by remember { mutableStateOf(CategoriaGasto.COMIDA) }
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
                SelectorDesplegable(
                    valorSeleccionado = categoria.etiqueta,
                    etiqueta = "Categoría",
                    opciones = CategoriaGasto.entries,
                    etiquetaDe = { it.etiqueta },
                    onSeleccionar = { categoria = it },
                    modifier = Modifier.fillMaxWidth()
                )
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
