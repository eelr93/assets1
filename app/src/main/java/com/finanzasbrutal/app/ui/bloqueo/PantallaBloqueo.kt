package com.finanzasbrutal.app.ui.bloqueo

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.finanzasbrutal.app.ui.theme.RojoGasto
import com.finanzasbrutal.app.util.SeguridadUtils

private const val AUTENTICADORES = BiometricManager.Authenticators.BIOMETRIC_STRONG

@Composable
fun PantallaBloqueo(pinHash: String?, onDesbloqueado: () -> Unit) {
    val activity = LocalContext.current as? FragmentActivity
    val biometriaDisponible = activity != null &&
        BiometricManager.from(activity).canAuthenticate(AUTENTICADORES) == BiometricManager.BIOMETRIC_SUCCESS

    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (activity != null && biometriaDisponible) {
            autenticarConBiometria(activity, onExito = onDesbloqueado)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(96.dp))
        Icon(Icons.Filled.Lock, contentDescription = null, modifier = Modifier.size(48.dp))
        Spacer(Modifier.height(16.dp))
        Text("FinanzasBrutal está bloqueada", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(24.dp))

        OutlinedTextField(
            value = pin,
            onValueChange = { pin = it; error = false },
            label = { Text("PIN") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            isError = error,
            modifier = Modifier.fillMaxWidth()
        )
        if (error) {
            Spacer(Modifier.height(4.dp))
            Text("PIN incorrecto", color = RojoGasto, style = MaterialTheme.typography.labelMedium)
        }
        Spacer(Modifier.height(16.dp))

        Button(
            onClick = {
                if (pinHash != null && SeguridadUtils.hashPin(pin) == pinHash) {
                    onDesbloqueado()
                } else {
                    error = true
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) { Text("Desbloquear") }

        if (biometriaDisponible) {
            Spacer(Modifier.height(8.dp))
            TextButton(onClick = { autenticarConBiometria(activity!!, onExito = onDesbloqueado) }) {
                Text("Usar huella o rostro")
            }
        }
    }
}

private fun autenticarConBiometria(activity: FragmentActivity, onExito: () -> Unit) {
    val executor = ContextCompat.getMainExecutor(activity)
    val prompt = BiometricPrompt(
        activity,
        executor,
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onExito()
            }
        }
    )
    val info = BiometricPrompt.PromptInfo.Builder()
        .setTitle("Desbloquear FinanzasBrutal")
        .setNegativeButtonText("Usar PIN")
        .build()
    prompt.authenticate(info)
}
