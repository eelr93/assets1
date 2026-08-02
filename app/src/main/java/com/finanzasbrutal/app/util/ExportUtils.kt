package com.finanzasbrutal.app.util

import android.content.Context
import com.finanzasbrutal.app.data.local.entity.Gasto
import com.finanzasbrutal.app.data.local.entity.Ingreso
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.time.LocalDate

object ExportUtils {

    suspend fun exportarCsv(context: Context, ingresos: List<Ingreso>, gastos: List<Gasto>): File =
        withContext(Dispatchers.IO) {
            val carpeta = File(context.cacheDir, "exportados").apply { mkdirs() }
            val archivo = File(carpeta, "finanzas_brutal_${LocalDate.now()}.csv")

            archivo.bufferedWriter().use { writer ->
                writer.appendLine("Tipo,Fecha,Descripción,Categoría,Monto")
                ingresos.sortedBy { it.fecha }.forEach {
                    writer.appendLine("Ingreso,${it.fecha},${escapar(it.descripcion)},${it.tipo},${it.monto}")
                }
                gastos.sortedBy { it.fecha }.forEach {
                    writer.appendLine("Gasto,${it.fecha},${escapar(it.descripcion)},${it.categoria.etiqueta},${it.monto}")
                }
            }
            archivo
        }

    private fun escapar(texto: String): String = "\"${texto.replace("\"", "\"\"")}\""
}
