package com.finanzasbrutal.app.util

import java.security.MessageDigest

/**
 * Protección básica de acceso local (no reemplaza cifrado de la base de datos).
 * El PIN nunca se guarda en texto plano, solo su hash SHA-256.
 */
object SeguridadUtils {
    fun hashPin(pin: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(pin.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
