package com.finanzasbrutal.app.ui.common

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.CreationExtras

/** Factory genérica: crea cualquier ViewModel a partir de una lambda, sin necesidad de DI. */
class FinanzasViewModelFactory(private val crear: () -> ViewModel) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>, extras: CreationExtras): T = crear() as T
}
