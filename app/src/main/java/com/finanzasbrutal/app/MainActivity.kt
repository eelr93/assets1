package com.finanzasbrutal.app

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import com.finanzasbrutal.app.ui.navigation.NavGraph
import com.finanzasbrutal.app.ui.theme.FinanzasBrutalTheme

class MainActivity : ComponentActivity() {

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

                    NavGraph(repository)
                }
            }
        }
    }
}
