package com.finanzasbrutal.app.util

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.finanzasbrutal.app.R
import com.finanzasbrutal.app.data.local.entity.GastoFijo

object NotificationHelper {
    const val CANAL_ID = "recordatorios_financieros"
    private const val ID_INGRESO = 1001
    private const val ID_ALERTA = 1002
    private const val ID_DEUDA_BASE = 2000

    fun crearCanal(context: Context) {
        val canal = NotificationChannel(
            CANAL_ID,
            context.getString(R.string.canal_recordatorios_nombre),
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = context.getString(R.string.canal_recordatorios_desc)
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(canal)
    }

    private fun tienePermiso(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ActivityCompat.checkSelfPermission(
            context, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun notificarIngresoSemanal(context: Context, montoTotal: Double) {
        if (!tienePermiso(context)) return
        val notificacion = NotificationCompat.Builder(context, CANAL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(context.getString(R.string.notif_ingreso_titulo))
            .setContentText(context.getString(R.string.notif_ingreso_texto, CurrencyUtils.formatear(montoTotal)))
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context).notify(ID_INGRESO, notificacion)
    }

    fun notificarAlertaGastos(context: Context) {
        if (!tienePermiso(context)) return
        val notificacion = NotificationCompat.Builder(context, CANAL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(context.getString(R.string.notif_alerta_gastos_titulo))
            .setContentText(context.getString(R.string.notif_alerta_gastos_texto))
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context).notify(ID_ALERTA, notificacion)
    }

    fun notificarDeudaPorVencer(context: Context, gastoFijo: GastoFijo) {
        if (!tienePermiso(context)) return
        val restantes = gastoFijo.mesesRestantes() ?: return
        val notificacion = NotificationCompat.Builder(context, CANAL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(context.getString(R.string.notif_deuda_titulo))
            .setContentText(context.getString(R.string.notif_deuda_texto, gastoFijo.nombre, restantes))
            .setAutoCancel(true)
            .build()
        NotificationManagerCompat.from(context).notify(ID_DEUDA_BASE + gastoFijo.id.toInt(), notificacion)
    }
}
