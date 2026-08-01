package com.finanzasbrutal.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import kotlinx.coroutines.flow.Flow

@Dao
interface GastoFijoDao {

    @Insert
    suspend fun insertarTodos(gastosFijos: List<GastoFijo>)

    @Update
    suspend fun actualizar(gastoFijo: GastoFijo)

    @Query("SELECT * FROM gastos_fijos ORDER BY orden ASC")
    fun observarTodos(): Flow<List<GastoFijo>>

    @Query("SELECT * FROM gastos_fijos WHERE activo = 1 ORDER BY orden ASC")
    suspend fun obtenerActivos(): List<GastoFijo>

    @Query("SELECT COUNT(*) FROM gastos_fijos")
    suspend fun contar(): Int
}
