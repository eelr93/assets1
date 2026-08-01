package com.finanzasbrutal.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.ui.graphics.vector.ImageVector
import com.finanzasbrutal.app.R

sealed class Screen(val ruta: String, val labelRes: Int, val icono: ImageVector) {
    data object Dashboard : Screen("dashboard", R.string.nav_dashboard, Icons.Filled.Home)
    data object Ingresos : Screen("ingresos", R.string.nav_ingresos, Icons.Filled.AccountBalanceWallet)
    data object Gastos : Screen("gastos", R.string.nav_gastos, Icons.Filled.ShoppingCart)
    data object Graficos : Screen("graficos", R.string.nav_graficos, Icons.Filled.BarChart)
    data object Configuracion : Screen("configuracion", R.string.nav_configuracion, Icons.Filled.Settings)

    companion object {
        val items = listOf(Dashboard, Ingresos, Gastos, Graficos, Configuracion)
    }
}
