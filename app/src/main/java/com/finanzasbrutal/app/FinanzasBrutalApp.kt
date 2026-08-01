package com.finanzasbrutal.app

import android.app.Application
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.finanzasbrutal.app.data.local.AppDatabase
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.util.NotificationHelper
import com.finanzasbrutal.app.worker.CheckDiarioWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit

class FinanzasBrutalApp : Application() {

    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val database: AppDatabase by lazy { AppDatabase.obtenerInstancia(this) }

    val repository: FinanzasRepository by lazy {
        FinanzasRepository(
            database.ingresoDao(),
            database.gastoDao(),
            database.gastoFijoDao(),
            database.configuracionDao()
        )
    }

    override fun onCreate() {
        super.onCreate()
        NotificationHelper.crearCanal(this)

        applicationScope.launch {
            repository.asegurarSemilla()
            repository.asegurarIngresosSemanales()
        }

        programarChequeoDiario()
    }

    private fun programarChequeoDiario() {
        val solicitud = PeriodicWorkRequestBuilder<CheckDiarioWorker>(12, TimeUnit.HOURS).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            CheckDiarioWorker.NOMBRE_TRABAJO,
            ExistingPeriodicWorkPolicy.KEEP,
            solicitud
        )
    }
}
