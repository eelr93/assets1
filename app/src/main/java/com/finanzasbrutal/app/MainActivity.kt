package com.finanzasbrutal.app

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.finanzasbrutal.app.ui.bloqueo.BloqueoViewModel
import com.finanzasbrutal.app.ui.bloqueo.PantallaBloqueo
import com.finanzasbrutal.app.ui.common.FinanzasViewModelFactory
import com.finanzasbrutal.app.ui.navigation.NavGraph
import com.finanzasbrutal.app.ui.theme.FinanzasBrutalTheme

class MainActivity : FragmentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repository = (application as FinanzasBrutalApp).repository

        setContent {
            FinanzasBrutalTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    val lanzadorPermiso = rememberLauncherForActivityResult(
                        ActivityResultContracts.RequestPermission()
                    ) { /* si se deniega, simplemente no se muestran notificaciones */ }

                    LaunchedEffect(Unit) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            lanzadorPermiso.launch(Manifest.permission.POST_NOTIFICATIONS)
                        }
                    }

                    val bloqueoViewModel: BloqueoViewModel = viewModel(
                        factory = FinanzasViewModelFactory { BloqueoViewModel(repository) }
                    )
                    val configuracion by bloqueoViewModel.configuracion.collectAsStateWithLifecycle()
                    var desbloqueado by rememberSaveable { mutableStateOf(false) }

                    if (configuracion.bloqueoActivo && !desbloqueado) {
                        PantallaBloqueo(
                            pinHash = configuracion.pinHash,
                            onDesbloqueado = { desbloqueado = true }
                        )
                    } else {
                        NavGraph(repository)
                    }
                }
            }
        }
    }
}
