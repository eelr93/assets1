package com.finanzasbrutal.app.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.finanzasbrutal.app.FinanzasBrutalApp
import com.finanzasbrutal.app.util.NotificationHelper

/**
 * Corre periódicamente en background: genera el ingreso semanal si corresponde,
 * y evalúa las alertas de gasto excedido y de deuda por vencer.
 */
class CheckDiarioWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val repositorio = (applicationContext as FinanzasBrutalApp).repository

        return try {
            val config = repositorio.obtenerConfiguracion()

            val nuevosIngresos = repositorio.asegurarIngresosSemanales()
            if (nuevosIngresos.isNotEmpty()) {
                NotificationHelper.notificarIngresoSemanal(
                    applicationContext,
                    config.ingresoSemanalAuto * nuevosIngresos.size
                )
            }

            if (config.notificacionesActivas) {
                if (repositorio.verificarAlertaGastos()) {
                    NotificationHelper.notificarAlertaGastos(applicationContext)
                }
                repositorio.deudasPorVencer().forEach { gastoFijo ->
                    NotificationHelper.notificarDeudaPorVencer(applicationContext, gastoFijo)
                }
            }

            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val NOMBRE_TRABAJO = "chequeo_diario_finanzas"
    }
}
