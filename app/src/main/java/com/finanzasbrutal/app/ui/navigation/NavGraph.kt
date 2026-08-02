package com.finanzasbrutal.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.finanzasbrutal.app.data.repository.FinanzasRepository
import com.finanzasbrutal.app.ui.configuracion.ConfiguracionScreen
import com.finanzasbrutal.app.ui.dashboard.DashboardScreen
import com.finanzasbrutal.app.ui.gastos.GastosScreen
import com.finanzasbrutal.app.ui.graficos.GraficosScreen
import com.finanzasbrutal.app.ui.ingresos.IngresosScreen

@Composable
fun NavGraph(repository: FinanzasRepository) {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val rutaActual = navBackStackEntry?.destination?.route

            NavigationBar {
                Screen.items.forEach { pantalla ->
                    NavigationBarItem(
                        selected = rutaActual == pantalla.ruta,
                        onClick = {
                            navController.navigate(pantalla.ruta) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(pantalla.icono, contentDescription = null) },
                        label = { Text(stringResource(pantalla.labelRes)) }
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.ruta,
            modifier = Modifier.padding(padding)
        ) {
            composable(Screen.Dashboard.ruta) { DashboardScreen(repository) }
            composable(Screen.Ingresos.ruta) { IngresosScreen(repository) }
            composable(Screen.Gastos.ruta) { GastosScreen(repository) }
            composable(Screen.Graficos.ruta) { GraficosScreen(repository) }
            composable(Screen.Configuracion.ruta) { ConfiguracionScreen(repository) }
        }
    }
}
