package com.finanzasbrutal.app.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import com.finanzasbrutal.app.data.local.entity.Gasto
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate

@Dao
interface GastoDao {

    @Insert
    suspend fun insertar(gasto: Gasto): Long

    @Delete
    suspend fun eliminar(gasto: Gasto)

    @Query("SELECT * FROM gastos ORDER BY fecha DESC, id DESC")
    fun observarTodos(): Flow<List<Gasto>>

    @Query("SELECT * FROM gastos ORDER BY fecha ASC, id ASC")
    suspend fun obtenerTodosOrdenAsc(): List<Gasto>

    @Query("SELECT COALESCE(SUM(monto), 0) FROM gastos WHERE fecha BETWEEN :desde AND :hasta")
    suspend fun sumaEntreFechas(desde: LocalDate, hasta: LocalDate): Double
}
