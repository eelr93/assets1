package com.finanzasbrutal.app.data.local.dao

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Upsert
import com.finanzasbrutal.app.data.local.entity.Configuracion
import kotlinx.coroutines.flow.Flow

@Dao
interface ConfiguracionDao {

    @Upsert
    suspend fun guardar(configuracion: Configuracion)

    @Query("SELECT * FROM configuracion WHERE id = 1")
    fun observar(): Flow<Configuracion?>

    @Query("SELECT * FROM configuracion WHERE id = 1")
    suspend fun obtener(): Configuracion?

    @Query("SELECT COUNT(*) FROM configuracion")
    suspend fun contar(): Int
}
