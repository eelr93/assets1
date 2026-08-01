package com.finanzasbrutal.app.util

import java.text.NumberFormat
import java.util.Locale

object CurrencyUtils {
    private val formato: NumberFormat =
        NumberFormat.getCurrencyInstance(Locale("es", "AR")).apply {
            maximumFractionDigits = 0
        }

    fun formatear(monto: Double): String = formato.format(monto)

    /** Acepta tanto coma como punto decimal al tipear un monto. */
    fun aMontoOrNull(texto: String): Double? = texto.trim().replace(',', '.').toDoubleOrNull()
}
