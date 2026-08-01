package com.finanzasbrutal.app.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import com.finanzasbrutal.app.data.local.entity.Ingreso
import kotlinx.coroutines.flow.Flow

@Dao
interface IngresoDao {

    @Insert
    suspend fun insertar(ingreso: Ingreso): Long

    @Delete
    suspend fun eliminar(ingreso: Ingreso)

    @Query("SELECT * FROM ingresos ORDER BY fecha DESC, id DESC")
    fun observarTodos(): Flow<List<Ingreso>>

    @Query("SELECT * FROM ingresos ORDER BY fecha ASC, id ASC")
    suspend fun obtenerTodosOrdenAsc(): List<Ingreso>
}
