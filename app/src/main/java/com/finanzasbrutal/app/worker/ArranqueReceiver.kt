package com.finanzasbrutal.app.worker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Arranca el proceso en el boot para que FinanzasBrutalApp.onCreate() reprograme
 * el trabajo periódico (WorkManager no lo hace hasta que algún componente inicia la app).
 */
class ArranqueReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // La reprogramación ocurre en FinanzasBrutalApp.onCreate(), disparado al crear este proceso.
    }
}
