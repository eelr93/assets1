package com.finanzasbrutal.app.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Update
import com.finanzasbrutal.app.data.local.entity.MetaAhorro
import kotlinx.coroutines.flow.Flow

@Dao
interface MetaAhorroDao {

    @Insert
    suspend fun insertar(meta: MetaAhorro): Long

    @Update
    suspend fun actualizar(meta: MetaAhorro)

    @Delete
    suspend fun eliminar(meta: MetaAhorro)

    @Query("SELECT * FROM metas_ahorro ORDER BY completada ASC, fechaCreacion DESC")
    fun observarTodas(): Flow<List<MetaAhorro>>
}
