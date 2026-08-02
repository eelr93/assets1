package com.finanzasbrutal.app.ui.theme

import androidx.compose.ui.graphics.Color
import com.finanzasbrutal.app.data.local.entity.CategoriaGasto

val AzulIngreso = Color(0xFF1E88E5)
val VerdeAhorro = Color(0xFF2E7D32)
val RojoGasto = Color(0xFFC62828)

val AzulIngresoContainer = Color(0xFFD3E6FB)
val VerdeAhorroContainer = Color(0xFFCDE7CF)
val RojoGastoContainer = Color(0xFFF7D2D2)

val ColoresCategoria = mapOf(
    CategoriaGasto.COMIDA to Color(0xFFEF6C00),
    CategoriaGasto.GASOLINA to Color(0xFF6D4C41),
    CategoriaGasto.SALUD to Color(0xFF8E24AA),
    CategoriaGasto.GYM to Color(0xFF00897B),
    CategoriaGasto.SUSCRIPCIONES to Color(0xFF3949AB),
    CategoriaGasto.SERVICIOS to Color(0xFFFDD835),
    CategoriaGasto.DEUDA to RojoGasto,
    CategoriaGasto.OTRO to Color(0xFF757575)
)

fun colorDeCategoria(categoria: CategoriaGasto): Color = ColoresCategoria[categoria] ?: Color.Gray
