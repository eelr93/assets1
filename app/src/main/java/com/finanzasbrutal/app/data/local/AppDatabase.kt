package com.finanzasbrutal.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.finanzasbrutal.app.data.local.dao.ConfiguracionDao
import com.finanzasbrutal.app.data.local.dao.GastoDao
import com.finanzasbrutal.app.data.local.dao.GastoFijoDao
import com.finanzasbrutal.app.data.local.dao.IngresoDao
import com.finanzasbrutal.app.data.local.entity.Configuracion
import com.finanzasbrutal.app.data.local.entity.Gasto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.local.entity.Ingreso

@Database(
    entities = [Ingreso::class, Gasto::class, GastoFijo::class, Configuracion::class],
    version = 2,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    abstract fun ingresoDao(): IngresoDao
    abstract fun gastoDao(): GastoDao
    abstract fun gastoFijoDao(): GastoFijoDao
    abstract fun configuracionDao(): ConfiguracionDao

    companion object {
        @Volatile
        private var instancia: AppDatabase? = null

        fun obtenerInstancia(context: Context): AppDatabase =
            instancia ?: synchronized(this) {
                instancia ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "finanzas_brutal.db"
                )
                    // App todavía no publicada: no hay datos de usuarios reales que migrar.
                    .fallbackToDestructiveMigration()
                    .build().also { instancia = it }
            }
    }
}
