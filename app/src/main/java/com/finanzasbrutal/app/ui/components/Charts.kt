package com.finanzasbrutal.app.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.repository.PuntoHistorial
import com.finanzasbrutal.app.ui.theme.AzulIngreso
import com.finanzasbrutal.app.ui.theme.RojoGasto
import com.finanzasbrutal.app.ui.theme.VerdeAhorro
import com.finanzasbrutal.app.ui.theme.colorDeCategoria
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun GraficoLineaAhorro(puntos: List<PuntoHistorial>, modifier: Modifier = Modifier) {
    if (puntos.isEmpty()) {
        EstadoVacio("Todavía no hay datos suficientes", modifier)
        return
    }
    val maxAbs = (puntos.maxOfOrNull { abs(it.ahorro) } ?: 0.0).coerceAtLeast(1.0)
    val colorLinea = AzulIngreso
    val colorEje = MaterialTheme.colorScheme.outlineVariant

    Column(modifier) {
        Canvas(Modifier.fillMaxWidth().height(180.dp)) {
            val padding = 8.dp.toPx()
            val medio = size.height / 2f
            drawLine(colorEje, Offset(0f, medio), Offset(size.width, medio), strokeWidth = 1.dp.toPx())

            val n = puntos.size
            val pasoX = if (n > 1) (size.width - 2 * padding) / (n - 1) else 0f
            val puntosCanvas = puntos.mapIndexed { i, p ->
                val x = padding + i * pasoX
                val y = medio - (p.ahorro / maxAbs).toFloat() * (medio - 12.dp.toPx())
                Offset(x, y)
            }
            for (i in 0 until puntosCanvas.size - 1) {
                drawLine(
                    color = colorLinea,
                    start = puntosCanvas[i],
                    end = puntosCanvas[i + 1],
                    strokeWidth = 3.dp.toPx(),
                    cap = StrokeCap.Round
                )
            }
            puntosCanvas.forEachIndexed { i, offset ->
                drawCircle(
                    color = if (puntos[i].ahorro >= 0) VerdeAhorro else RojoGasto,
                    radius = 5.dp.toPx(),
                    center = offset
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            puntos.forEach { p ->
                Text(
                    p.etiqueta,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun GraficoPastelCategorias(datos: Map<CategoriaGasto, Double>, modifier: Modifier = Modifier) {
    val total = datos.values.sum()
    if (total <= 0.0) {
        EstadoVacio("Sin gastos registrados en este período", modifier)
        return
    }

    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Canvas(Modifier.size(150.dp)) {
            var anguloInicio = -90f
            datos.entries.sortedByDescending { it.value }.forEach { (categoria, monto) ->
                val angulo = (monto / total * 360.0).toFloat()
                drawArc(
                    color = colorDeCategoria(categoria),
                    startAngle = anguloInicio,
                    sweepAngle = angulo,
                    useCenter = true
                )
                anguloInicio += angulo
            }
        }
        Spacer(Modifier.width(16.dp))
        Column {
            datos.entries.sortedByDescending { it.value }.forEach { (categoria, monto) ->
                LeyendaItem(colorDeCategoria(categoria), "${categoria.etiqueta} · ${(monto / total * 100).roundToInt()}%")
            }
        }
    }
}

@Composable
fun GraficoComparativo(puntos: List<PuntoHistorial>, modifier: Modifier = Modifier) {
    if (puntos.isEmpty()) {
        EstadoVacio("Todavía no hay datos suficientes", modifier)
        return
    }
    val maxValor = (puntos.maxOfOrNull { maxOf(it.ingreso, it.gasto) } ?: 0.0).coerceAtLeast(1.0)

    Column(modifier) {
        Canvas(Modifier.fillMaxWidth().height(180.dp)) {
            val n = puntos.size
            val anchoGrupo = size.width / n
            val anchoBarra = (anchoGrupo / 3.2f).coerceAtLeast(4.dp.toPx())
            val separacion = 3.dp.toPx()

            puntos.forEachIndexed { i, p ->
                val xCentro = i * anchoGrupo + anchoGrupo / 2
                val altoIngreso = (p.ingreso / maxValor).toFloat() * size.height
                val altoGasto = (p.gasto / maxValor).toFloat() * size.height

                drawRect(
                    color = AzulIngreso,
                    topLeft = Offset(xCentro - anchoBarra - separacion, size.height - altoIngreso),
                    size = Size(anchoBarra, altoIngreso)
                )
                drawRect(
                    color = RojoGasto,
                    topLeft = Offset(xCentro + separacion, size.height - altoGasto),
                    size = Size(anchoBarra, altoGasto)
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            puntos.forEach { p ->
                Text(
                    p.etiqueta,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        Row {
            LeyendaItem(AzulIngreso, "Ingreso")
            Spacer(Modifier.width(16.dp))
            LeyendaItem(RojoGasto, "Gasto")
        }
    }
}

@Composable
private fun LeyendaItem(color: Color, texto: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Spacer(
            Modifier
                .size(10.dp)
                .background(color, CircleShape)
        )
        Spacer(Modifier.width(6.dp))
        Text(texto, style = MaterialTheme.typography.labelMedium)
    }
}
