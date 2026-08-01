package com.finanzasbrutal.app.data.repository

import com.finanzasbrutal.app.data.local.dao.ConfiguracionDao
import com.finanzasbrutal.app.data.local.dao.GastoDao
import com.finanzasbrutal.app.data.local.dao.GastoFijoDao
import com.finanzasbrutal.app.data.local.dao.IngresoDao
import com.finanzasbrutal.app.data.local.entity.CategoriaGasto
import com.finanzasbrutal.app.data.local.entity.Configuracion
import com.finanzasbrutal.app.data.local.entity.ConfiguracionPorDefecto
import com.finanzasbrutal.app.data.local.entity.Gasto
import com.finanzasbrutal.app.data.local.entity.GastoFijo
import com.finanzasbrutal.app.data.local.entity.GastosFijosPorDefecto
import com.finanzasbrutal.app.data.local.entity.Ingreso
import com.finanzasbrutal.app.data.local.entity.TipoIngreso
import com.finanzasbrutal.app.util.DateUtils
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.DayOfWeek
import java.time.LocalDate

/** Semanas promedio por mes, usado para estimar el ingreso mensual a partir del semanal. */
const val SEMANAS_POR_MES = 52.0 / 12.0

class FinanzasRepository(
    private val ingresoDao: IngresoDao,
    private val gastoDao: GastoDao,
    private val gastoFijoDao: GastoFijoDao,
    private val configuracionDao: ConfiguracionDao
) {
    // ---------- Observación reactiva ----------

    fun observarIngresos(): Flow<List<Ingreso>> = ingresoDao.observarTodos()

    fun observarGastos(): Flow<List<Gasto>> = gastoDao.observarTodos()

    fun observarGastosFijos(): Flow<List<GastoFijo>> = gastoFijoDao.observarTodos()

    fun observarConfiguracion(): Flow<Configuracion> =
        configuracionDao.observar().map { it ?: ConfiguracionPorDefecto.crear() }

    // ---------- Escritura ----------

    suspend fun registrarIngresoManual(monto: Double, descripcion: String, fecha: LocalDate = LocalDate.now()) {
        ingresoDao.insertar(
            Ingreso(monto = monto, fecha = fecha, descripcion = descripcion, tipo = TipoIngreso.MANUAL)
        )
    }

    suspend fun eliminarIngreso(ingreso: Ingreso) = ingresoDao.eliminar(ingreso)

    suspend fun registrarGasto(
        monto: Double,
        descripcion: String,
        categoria: CategoriaGasto,
        fecha: LocalDate = LocalDate.now()
    ) {
        gastoDao.insertar(
            Gasto(monto = monto, fecha = fecha, descripcion = descripcion, categoria = categoria)
        )
    }

    suspend fun eliminarGasto(gasto: Gasto) = gastoDao.eliminar(gasto)

    suspend fun actualizarGastoFijo(gastoFijo: GastoFijo) = gastoFijoDao.actualizar(gastoFijo)

    suspend fun actualizarConfiguracion(configuracion: Configuracion) = configuracionDao.guardar(configuracion)

    suspend fun obtenerConfiguracion(): Configuracion =
        configuracionDao.obtener() ?: ConfiguracionPorDefecto.crear()

    // ---------- Inicialización ----------

    suspend fun asegurarSemilla() {
        if (configuracionDao.contar() == 0) {
            configuracionDao.guardar(ConfiguracionPorDefecto.crear())
        }
        if (gastoFijoDao.contar() == 0) {
            gastoFijoDao.insertarTodos(GastosFijosPorDefecto.crear())
        }
    }

    /**
     * Genera el ingreso semanal automático por cada día de corte transcurrido desde el
     * último generado (o desde el corte más reciente si es la primera vez). Devuelve las
     * fechas de los ingresos nuevos, para poder notificar al usuario.
     */
    suspend fun asegurarIngresosSemanales(hoy: LocalDate = LocalDate.now()): List<LocalDate> {
        val config = obtenerConfiguracion()
        val diaCorte = DayOfWeek.of(config.diaCorteIngreso)
        val nuevos = mutableListOf<LocalDate>()

        var siguiente = config.ultimoIngresoAutoGenerado?.plusWeeks(1)
            ?: DateUtils.inicioSemana(hoy, diaCorte)

        while (!siguiente.isAfter(hoy)) {
            ingresoDao.insertar(
                Ingreso(
                    monto = config.ingresoSemanalAuto,
                    fecha = siguiente,
                    descripcion = "Ingreso semanal automático",
                    tipo = TipoIngreso.AUTOMATICO
                )
            )
            nuevos.add(siguiente)
            siguiente = siguiente.plusWeeks(1)
        }

        if (nuevos.isNotEmpty()) {
            configuracionDao.guardar(config.copy(ultimoIngresoAutoGenerado = nuevos.last()))
        }
        return nuevos
    }

    // ---------- Alertas ----------

    suspend fun verificarAlertaGastos(hoy: LocalDate = LocalDate.now()): Boolean {
        val config = obtenerConfiguracion()
        val ingresoMensualEstimado = config.ingresoSemanalAuto * SEMANAS_POR_MES
        if (ingresoMensualEstimado <= 0) return false
        val gastoMes = gastoDao.sumaEntreFechas(DateUtils.inicioMes(hoy), DateUtils.finMes(hoy))
        return gastoMes >= config.umbralAlertaPorcentaje * ingresoMensualEstimado
    }

    suspend fun deudasPorVencer(hoy: LocalDate = LocalDate.now()): List<GastoFijo> =
        gastoFijoDao.obtenerActivos().filter { fijo ->
            val restantes = fijo.mesesRestantes(hoy)
            fijo.esDeuda && restantes != null && restantes in 1..2
        }

    // ---------- Datos para gráficos ----------

    suspend fun historialSemanal(semanas: Int = 8, hoy: LocalDate = LocalDate.now()): List<PuntoHistorial> {
        val config = obtenerConfiguracion()
        val diaCorte = DayOfWeek.of(config.diaCorteIngreso)
        val ingresos = ingresoDao.obtenerTodosOrdenAsc()
        val gastos = gastoDao.obtenerTodosOrdenAsc()
        val inicioActual = DateUtils.inicioSemana(hoy, diaCorte)

        return (semanas - 1 downTo 0).map { offset ->
            val inicio = inicioActual.minusWeeks(offset.toLong())
            val fin = inicio.plusDays(6)
            val ingresoSemana = ingresos.filter { !it.fecha.isBefore(inicio) && !it.fecha.isAfter(fin) }
                .sumOf { it.monto }
            val gastoSemana = gastos.filter { !it.fecha.isBefore(inicio) && !it.fecha.isAfter(fin) }
                .sumOf { it.monto }
            PuntoHistorial("${inicio.dayOfMonth}/${inicio.monthValue}", ingresoSemana, gastoSemana)
        }
    }

    suspend fun historialMensual(meses: Int = 6, hoy: LocalDate = LocalDate.now()): List<PuntoHistorial> {
        val ingresos = ingresoDao.obtenerTodosOrdenAsc()
        val gastos = gastoDao.obtenerTodosOrdenAsc()
        val inicioActual = DateUtils.inicioMes(hoy)

        return (meses - 1 downTo 0).map { offset ->
            val inicio = inicioActual.minusMonths(offset.toLong())
            val fin = DateUtils.finMes(inicio)
            val ingresoMes = ingresos.filter { !it.fecha.isBefore(inicio) && !it.fecha.isAfter(fin) }
                .sumOf { it.monto }
            val gastoMes = gastos.filter { !it.fecha.isBefore(inicio) && !it.fecha.isAfter(fin) }
                .sumOf { it.monto }
            PuntoHistorial(DateUtils.NOMBRES_MES[inicio.monthValue - 1], ingresoMes, gastoMes)
        }
    }

    suspend fun distribucionGastosPorCategoria(desde: LocalDate, hasta: LocalDate): Map<CategoriaGasto, Double> {
        val gastos = gastoDao.obtenerTodosOrdenAsc()
        return gastos
            .filter { !it.fecha.isBefore(desde) && !it.fecha.isAfter(hasta) }
            .groupBy { it.categoria }
            .mapValues { (_, lista) -> lista.sumOf { it.monto } }
    }
}
