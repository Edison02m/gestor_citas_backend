// src/repositories/reportes.repository.ts

import { PrismaClient, Prisma } from '@prisma/client';
import {
  FiltrosReportesDto,
  PeriodoStats,
  ClienteFrecuente,
  ServicioVendido,
  DatoTemporal,
  OcupacionEmpleado,
  TasaUtilizacion,
  IngresosPorHora,
  RankingEmpleado,
  HorasPico,
  ValorVidaCliente,
} from '../models/reportes.model';

export class ReportesRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Helper para parsear fechas sin problemas de zona horaria
   */
  private parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Construir filtro WHERE base para todas las queries
   */
  private buildWhereClause(negocioId: string, filtros: FiltrosReportesDto): Prisma.CitaWhereInput {
    const where: Prisma.CitaWhereInput = {
      negocioId,
    };

    // Filtro de fechas
    if (filtros.fechaInicio && filtros.fechaFin) {
      where.fecha = {
        gte: this.parseDate(filtros.fechaInicio),
        lte: this.parseDate(filtros.fechaFin),
      };
    }

    // Filtro de empleado
    if (filtros.empleadoId) {
      where.empleadoId = filtros.empleadoId;
    }

    // Filtro de servicio
    if (filtros.servicioId) {
      where.servicioId = filtros.servicioId;
    }

    // Filtro de sucursal
    if (filtros.sucursalId) {
      where.sucursalId = filtros.sucursalId;
    }

    // Filtro de cliente
    if (filtros.clienteId) {
      where.clienteId = filtros.clienteId;
    }

    return where;
  }

  /**
   * Obtener estadísticas del período (Dashboard General)
   */
  async getDashboardStats(negocioId: string, filtros: FiltrosReportesDto): Promise<PeriodoStats> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Ejecutar todas las queries en paralelo para mejor performance
    const [
      totalCitas,
      citasPendientes,
      citasConfirmadas,
      citasCompletadas,
      citasCanceladas,
      citasNoAsistio,
      ingresoData,
    ] = await Promise.all([
      this.prisma.cita.count({ where }),
      this.prisma.cita.count({ where: { ...where, estado: 'PENDIENTE' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'CONFIRMADA' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'COMPLETADA' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'CANCELADA' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'NO_ASISTIO' } }),
      this.prisma.cita.aggregate({
        where: { ...where, estado: 'COMPLETADA' },
        _sum: { precioTotal: true },
      }),
    ]);

    const ingresoTotal = Number(ingresoData._sum.precioTotal || 0);

    // Calcular tasas
    const tasaAsistencia = totalCitas > 0 ? (citasCompletadas / totalCitas) * 100 : 0;
    const tasaCancelacion = totalCitas > 0 ? ((citasCanceladas + citasNoAsistio) / totalCitas) * 100 : 0;
    const ingresoPromedioPorCita = citasCompletadas > 0 ? ingresoTotal / citasCompletadas : 0;

    return {
      fechaInicio: filtros.fechaInicio || '',
      fechaFin: filtros.fechaFin || '',
      totalCitas,
      citasCompletadas,
      citasCanceladas,
      citasNoAsistio,
      citasPendientes,
      citasConfirmadas,
      tasaAsistencia: Math.round(tasaAsistencia * 100) / 100,
      tasaCancelacion: Math.round(tasaCancelacion * 100) / 100,
      ingresoTotal,
      ingresoPromedioPorCita: Math.round(ingresoPromedioPorCita * 100) / 100,
    };
  }

  /**
   * Obtener clientes frecuentes (Top N)
   */
  async getClientesFrecuentes(
    negocioId: string,
    filtros: FiltrosReportesDto,
    limit: number = 10
  ): Promise<ClienteFrecuente[]> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Agrupar citas por cliente y contar
    const citasPorCliente = await this.prisma.cita.groupBy({
      by: ['clienteId'],
      where,
      _count: { id: true },
      _sum: { precioTotal: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // Obtener detalles de los clientes
    const clientesIds = citasPorCliente.map((c) => c.clienteId);
    const clientes = await this.prisma.cliente.findMany({
      where: { id: { in: clientesIds } },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        email: true,
      },
    });

    // Obtener última cita y servicio favorito de cada cliente
    const clientesConDetalles = await Promise.all(
      citasPorCliente.map(async (citaCliente) => {
        const cliente = clientes.find((c) => c.id === citaCliente.clienteId);

        // Última cita
        const ultimaCita = await this.prisma.cita.findFirst({
          where: { clienteId: citaCliente.clienteId, negocioId },
          orderBy: { fecha: 'desc' },
          select: { fecha: true },
        });

        // Servicio favorito (más usado)
        const servicioFavorito = await this.prisma.cita.groupBy({
          by: ['servicioId'],
          where: { clienteId: citaCliente.clienteId, negocioId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1,
        });

        let servicioFavoritoNombre: string | undefined;
        let servicioFavoritoId: string | undefined;

        if (servicioFavorito.length > 0) {
          servicioFavoritoId = servicioFavorito[0].servicioId;
          const servicio = await this.prisma.servicio.findUnique({
            where: { id: servicioFavoritoId },
            select: { nombre: true },
          });
          servicioFavoritoNombre = servicio?.nombre;
        }

        return {
          clienteId: citaCliente.clienteId,
          nombre: cliente?.nombre || 'Cliente no encontrado',
          telefono: cliente?.telefono || '',
          email: cliente?.email || undefined,
          totalCitas: citaCliente._count.id,
          ultimaCita: ultimaCita?.fecha.toISOString().split('T')[0],
          ingresoGenerado: Number(citaCliente._sum.precioTotal || 0),
          servicioFavorito: servicioFavoritoNombre,
          servicioFavoritoId,
        };
      })
    );

    return clientesConDetalles;
  }

  /**
   * Obtener servicios más vendidos (Top N)
   */
  async getServiciosMasVendidos(
    negocioId: string,
    filtros: FiltrosReportesDto,
    limit: number = 10
  ): Promise<ServicioVendido[]> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Agrupar citas por servicio
    const citasPorServicio = await this.prisma.cita.groupBy({
      by: ['servicioId'],
      where,
      _count: { id: true },
      _sum: { precioTotal: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    // Calcular total de ventas para porcentajes
    const totalVentas = citasPorServicio.reduce((sum, s) => sum + s._count.id, 0);

    // Obtener detalles de los servicios
    const serviciosIds = citasPorServicio.map((s) => s.servicioId);
    const servicios = await this.prisma.servicio.findMany({
      where: { id: { in: serviciosIds } },
      select: {
        id: true,
        nombre: true,
        color: true,
        foto: true,
        duracion: true,
        precio: true,
      },
    });

    // Mapear resultados
    const serviciosVendidos = citasPorServicio.map((citaServicio) => {
      const servicio = servicios.find((s) => s.id === citaServicio.servicioId);
      const totalVentasServicio = citaServicio._count.id;
      const ingresoGenerado = Number(citaServicio._sum.precioTotal || 0);
      const porcentajeDelTotal = totalVentas > 0 ? (totalVentasServicio / totalVentas) * 100 : 0;

      return {
        servicioId: citaServicio.servicioId,
        nombre: servicio?.nombre || 'Servicio no encontrado',
        color: servicio?.color || '#3b82f6',
        foto: servicio?.foto || undefined,
        totalVentas: totalVentasServicio,
        ingresoGenerado,
        porcentajeDelTotal: Math.round(porcentajeDelTotal * 100) / 100,
        duracionPromedio: servicio?.duracion || 0,
        precioPromedio: totalVentasServicio > 0 ? ingresoGenerado / totalVentasServicio : 0,
      };
    });

    return serviciosVendidos;
  }

  /**
   * Obtener citas por día (para gráfico temporal)
   */
  async getCitasPorDia(negocioId: string, filtros: FiltrosReportesDto): Promise<DatoTemporal[]> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Obtener todas las citas agrupadas por fecha
    const citasPorFecha = await this.prisma.cita.groupBy({
      by: ['fecha'],
      where,
      _count: { id: true },
      _sum: { precioTotal: true },
      orderBy: { fecha: 'asc' },
    });

    // También obtener conteo por estado
    const citasCompletadasPorFecha = await this.prisma.cita.groupBy({
      by: ['fecha'],
      where: { ...where, estado: 'COMPLETADA' },
      _count: { id: true },
      _sum: { precioTotal: true }, // Ingresos solo de citas completadas
      orderBy: { fecha: 'asc' },
    });

    const citasCanceladasPorFecha = await this.prisma.cita.groupBy({
      by: ['fecha'],
      where: { ...where, estado: { in: ['CANCELADA', 'NO_ASISTIO'] } },
      _count: { id: true },
      orderBy: { fecha: 'asc' },
    });

    // Mapear resultados
    const datos: DatoTemporal[] = citasPorFecha.map((cita) => {
      const fechaStr = cita.fecha.toISOString().split('T')[0];
      const completadas = citasCompletadasPorFecha.find((c) => c.fecha.getTime() === cita.fecha.getTime())?._count.id || 0;
      const canceladas = citasCanceladasPorFecha.find((c) => c.fecha.getTime() === cita.fecha.getTime())?._count.id || 0;
      const ingresosCompletadas = citasCompletadasPorFecha.find((c) => c.fecha.getTime() === cita.fecha.getTime())?._sum.precioTotal || 0;

      return {
        label: fechaStr,
        totalCitas: cita._count.id,
        ingresos: Number(ingresosCompletadas), // Solo ingresos de citas completadas
        citasCompletadas: completadas,
        citasCanceladas: canceladas,
      };
    });

    return datos;
  }

  /**
   * Obtener ocupación de empleados
   */
  async getOcupacionEmpleados(negocioId: string, filtros: FiltrosReportesDto): Promise<OcupacionEmpleado[]> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Agrupar citas por empleado
    const citasPorEmpleado = await this.prisma.cita.groupBy({
      by: ['empleadoId'],
      where: { ...where, empleadoId: { not: null } },
      _count: { id: true },
      _sum: { precioTotal: true },
      orderBy: { _count: { id: 'desc' } },
    });

    // Obtener detalles de empleados
    const empleadosIds = citasPorEmpleado.map((c) => c.empleadoId).filter((id): id is string => id !== null);
    const empleados = await this.prisma.empleado.findMany({
      where: { id: { in: empleadosIds } },
      select: {
        id: true,
        nombre: true,
        foto: true,
        cargo: true,
      },
    });

    // Calcular días en el período para citas por día
    let diasEnPeriodo = 1;
    if (filtros.fechaInicio && filtros.fechaFin) {
      const inicio = this.parseDate(filtros.fechaInicio);
      const fin = this.parseDate(filtros.fechaFin);
      diasEnPeriodo = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    // Procesar datos de cada empleado
    const ocupacionEmpleados = await Promise.all(
      citasPorEmpleado.map(async (citaEmpleado) => {
        const empleado = empleados.find((e) => e.id === citaEmpleado.empleadoId);

        // Calcular horas trabajadas (sumar duraciones de servicios)
        const citasConDuracion = await this.prisma.cita.findMany({
          where: {
            empleadoId: citaEmpleado.empleadoId,
            ...where,
          },
          include: {
            servicio: {
              select: { duracion: true },
            },
          },
        });

        const minutosTotal = citasConDuracion.reduce((sum, cita) => sum + cita.servicio.duracion, 0);
        const horasTrabajadas = minutosTotal / 60;

        // Servicio más realizado
        const servicioMasRealizado = await this.prisma.cita.groupBy({
          by: ['servicioId'],
          where: { empleadoId: citaEmpleado.empleadoId, negocioId },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 1,
        });

        let servicioMasRealizadoNombre: string | undefined;
        let servicioMasRealizadoId: string | undefined;

        if (servicioMasRealizado.length > 0) {
          servicioMasRealizadoId = servicioMasRealizado[0].servicioId;
          const servicio = await this.prisma.servicio.findUnique({
            where: { id: servicioMasRealizadoId },
            select: { nombre: true },
          });
          servicioMasRealizadoNombre = servicio?.nombre;
        }

        return {
          empleadoId: citaEmpleado.empleadoId || '',
          nombre: empleado?.nombre || 'Empleado no encontrado',
          foto: empleado?.foto || undefined,
          cargo: empleado?.cargo || '',
          totalCitasAtendidas: citaEmpleado._count.id,
          horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
          ingresoGenerado: Number(citaEmpleado._sum.precioTotal || 0),
          citasPorDia: Math.round((citaEmpleado._count.id / diasEnPeriodo) * 100) / 100,
          servicioMasRealizado: servicioMasRealizadoNombre,
          servicioMasRealizadoId,
        };
      })
    );

    return ocupacionEmpleados;
  }

  /**
   * 1. Obtener tasa de utilización de empleados
   * Calcula las horas disponibles vs horas trabajadas por empleado
   */
  async getTasaUtilizacion(negocioId: string, filtros: FiltrosReportesDto): Promise<TasaUtilizacion[]> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Obtener todos los empleados del negocio (o filtrado)
    const empleadosWhere: Prisma.EmpleadoWhereInput = { negocioId };
    if (filtros.empleadoId) {
      empleadosWhere.id = filtros.empleadoId;
    }

    const empleados = await this.prisma.empleado.findMany({
      where: empleadosWhere,
      include: {
        horarios: true, // Incluir horarios de trabajo
      },
    });

    // Calcular días laborables en el período
    let diasEnPeriodo = 1;
    if (filtros.fechaInicio && filtros.fechaFin) {
      const inicio = this.parseDate(filtros.fechaInicio);
      const fin = this.parseDate(filtros.fechaFin);
      diasEnPeriodo = Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }

    // Calcular para cada empleado
    const tasasUtilizacion = await Promise.all(
      empleados.map(async (empleado) => {
        // 1. Calcular horas disponibles según horarios
        let minutosDisponiblesPorSemana = 0;
        
        empleado.horarios.forEach((horario) => {
          const [horaInicioHora, horaInicioMin] = horario.horaInicio.split(':').map(Number);
          const [horaFinHora, horaFinMin] = horario.horaFin.split(':').map(Number);
          
          const minutosInicio = horaInicioHora * 60 + horaInicioMin;
          const minutosFin = horaFinHora * 60 + horaFinMin;
          const minutosPorDia = minutosFin - minutosInicio;
          
          minutosDisponiblesPorSemana += minutosPorDia;
        });

        // Estimar horas disponibles en el período
        const semanasEnPeriodo = diasEnPeriodo / 7;
        const horasDisponibles = (minutosDisponiblesPorSemana * semanasEnPeriodo) / 60;

        // 2. Calcular horas trabajadas (citas completadas)
        const citasTrabajadas = await this.prisma.cita.findMany({
          where: {
            ...where,
            empleadoId: empleado.id,
          },
          include: {
            servicio: {
              select: { duracion: true },
            },
          },
        });

        const minutosTrabajados = citasTrabajadas.reduce((sum, cita) => sum + cita.servicio.duracion, 0);
        const horasTrabajadas = minutosTrabajados / 60;

        // 3. Calcular tasa de utilización
        const tasaUtilizacion = horasDisponibles > 0 ? (horasTrabajadas / horasDisponibles) * 100 : 0;

        // 4. Calcular espacios vacíos (slots de >30 min sin citas)
        const minutosVacios = Math.max(0, (horasDisponibles * 60) - minutosTrabajados);
        const espaciosVacios = Math.floor(minutosVacios / 30); // Bloques de 30 min

        return {
          empleadoId: empleado.id,
          empleadoNombre: empleado.nombre,
          horasDisponibles: Math.round(horasDisponibles * 100) / 100,
          horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
          tasaUtilizacion: Math.round(tasaUtilizacion * 100) / 100,
          citasTotales: citasTrabajadas.length,
          espaciosVacios,
        };
      })
    );

    return tasasUtilizacion.sort((a, b) => b.tasaUtilizacion - a.tasaUtilizacion);
  }

  /**
   * 2. Obtener ingresos por hora
   * Calcula el ingreso promedio por hora trabajada
   */
  async getIngresosPorHora(negocioId: string, filtros: FiltrosReportesDto): Promise<IngresosPorHora> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Obtener citas completadas
    const citasCompletadas = await this.prisma.cita.findMany({
      where: {
        ...where,
        estado: 'COMPLETADA',
      },
      include: {
        servicio: {
          select: { duracion: true },
        },
      },
    });

    if (citasCompletadas.length === 0) {
      return {
        ingresoTotal: 0,
        horasTrabajadas: 0,
        ingresoPorHora: 0,
        mejorDia: { dia: 'Sin datos', ingreso: 0 },
        mejorHorario: { hora: 'Sin datos', ingreso: 0 },
        tendencia: 'estable',
      };
    }

    // Calcular ingreso total y horas trabajadas
    const ingresoTotal = citasCompletadas.reduce((sum, cita) => sum + Number(cita.precioTotal), 0);
    const minutosTotales = citasCompletadas.reduce((sum, cita) => sum + cita.servicio.duracion, 0);
    const horasTotales = minutosTotales / 60;

    const ingresoPorHora = horasTotales > 0 ? ingresoTotal / horasTotales : 0;

    // Agrupar por día de la semana
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const ingresosPorDia = citasCompletadas.reduce((acc, cita) => {
      const diaSemana = diasSemana[cita.fecha.getDay()];
      if (!acc[diaSemana]) {
        acc[diaSemana] = { ingreso: 0, minutos: 0 };
      }
      acc[diaSemana].ingreso += Number(cita.precioTotal);
      acc[diaSemana].minutos += cita.servicio.duracion;
      return acc;
    }, {} as Record<string, { ingreso: number; minutos: number }>);

    // Encontrar mejor día (mayor ingreso por hora)
    let mejorDia = { dia: 'Sin datos', ingreso: 0 };
    Object.entries(ingresosPorDia).forEach(([dia, data]) => {
      const ingresoPorHoraDia = (data.minutos > 0) ? (data.ingreso / (data.minutos / 60)) : 0;
      if (ingresoPorHoraDia > mejorDia.ingreso) {
        mejorDia = { dia, ingreso: Math.round(ingresoPorHoraDia * 100) / 100 };
      }
    });

    // Agrupar por hora del día
    const ingresosPorHora = citasCompletadas.reduce((acc, cita) => {
      const [hora] = cita.horaInicio.split(':');
      const horaKey = `${hora}:00`;
      if (!acc[horaKey]) {
        acc[horaKey] = { ingreso: 0, minutos: 0 };
      }
      acc[horaKey].ingreso += Number(cita.precioTotal);
      acc[horaKey].minutos += cita.servicio.duracion;
      return acc;
    }, {} as Record<string, { ingreso: number; minutos: number }>);

    // Encontrar mejor horario
    let mejorHorario = { hora: 'Sin datos', ingreso: 0 };
    Object.entries(ingresosPorHora).forEach(([hora, data]) => {
      const ingresoPorHoraSlot = (data.minutos > 0) ? (data.ingreso / (data.minutos / 60)) : 0;
      if (ingresoPorHoraSlot > mejorHorario.ingreso) {
        mejorHorario = { hora, ingreso: Math.round(ingresoPorHoraSlot * 100) / 100 };
      }
    });

    // Calcular tendencia (comparar primeros 7 días vs últimos 7 días)
    const citasOrdenadas = [...citasCompletadas].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
    const mitad = Math.floor(citasOrdenadas.length / 2);
    
    const primerasMitad = citasOrdenadas.slice(0, mitad);
    const segundaMitad = citasOrdenadas.slice(mitad);

    const ingresoPrimeraMitad = primerasMitad.reduce((sum, c) => sum + Number(c.precioTotal), 0);
    const ingresoSegundaMitad = segundaMitad.reduce((sum, c) => sum + Number(c.precioTotal), 0);

    let tendencia: 'creciente' | 'estable' | 'decreciente' = 'estable';
    const diferencia = ((ingresoSegundaMitad - ingresoPrimeraMitad) / ingresoPrimeraMitad) * 100;
    
    if (diferencia > 10) tendencia = 'creciente';
    else if (diferencia < -10) tendencia = 'decreciente';

    return {
      ingresoTotal: Math.round(ingresoTotal * 100) / 100,
      horasTrabajadas: Math.round(horasTotales * 100) / 100,
      ingresoPorHora: Math.round(ingresoPorHora * 100) / 100,
      mejorDia,
      mejorHorario,
      tendencia,
    };
  }

  /**
   * 3. Obtener ranking de empleados
   * Ranking basado en tasa de completación e ingreso por hora
   */
  async getRankingEmpleados(negocioId: string, filtros: FiltrosReportesDto): Promise<RankingEmpleado[]> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Obtener todos los empleados
    const empleadosWhere: Prisma.EmpleadoWhereInput = { negocioId };
    if (filtros.empleadoId) {
      empleadosWhere.id = filtros.empleadoId;
    }

    const empleados = await this.prisma.empleado.findMany({
      where: empleadosWhere,
    });

    // Calcular métricas para cada empleado
    const empleadosConMetricas = await Promise.all(
      empleados.map(async (empleado) => {
        // Total de citas asignadas
        const totalCitas = await this.prisma.cita.count({
          where: {
            ...where,
            empleadoId: empleado.id,
          },
        });

        // Citas completadas
        const citasCompletadas = await this.prisma.cita.findMany({
          where: {
            ...where,
            empleadoId: empleado.id,
            estado: 'COMPLETADA',
          },
          include: {
            servicio: { select: { duracion: true } },
          },
        });

        // Calcular tasa de completación
        const tasaCompletacion = totalCitas > 0 ? (citasCompletadas.length / totalCitas) * 100 : 0;

        // Calcular ingreso por hora
        const ingresoTotal = citasCompletadas.reduce((sum, c) => sum + Number(c.precioTotal), 0);
        const minutosTotales = citasCompletadas.reduce((sum, c) => sum + c.servicio.duracion, 0);
        const ingresoPorHora = minutosTotales > 0 ? (ingresoTotal / (minutosTotales / 60)) : 0;

        // Puntuación total: 70% tasa completación + 30% ingreso normalizado
        // Normalizar ingreso por hora (asumiendo $50/hora como referencia)
        const ingresoNormalizado = Math.min(100, (ingresoPorHora / 50) * 100);
        const puntuacionTotal = (tasaCompletacion * 0.7) + (ingresoNormalizado * 0.3);

        // Calcular tasa de utilización (para simplificar, usamos un promedio aproximado)
        const horasTrabajadas = minutosTotales / 60;
        const tasaUtilizacion = horasTrabajadas > 0 ? Math.min(100, (horasTrabajadas / 40) * 100) : 0; // Asumiendo 40h/semana

        return {
          empleadoId: empleado.id,
          nombre: empleado.nombre,
          foto: empleado.foto,
          cargo: empleado.cargo,
          tasaCompletacion: Math.round(tasaCompletacion * 100) / 100,
          ingresoPorHora: Math.round(ingresoPorHora * 100) / 100,
          puntuacionTotal: Math.round(puntuacionTotal * 100) / 100,
          totalCitas,
          citasCompletadas: citasCompletadas.length,
          ingresoTotal: Math.round(ingresoTotal * 100) / 100,
          tasaUtilizacion: Math.round(tasaUtilizacion * 100) / 100,
        };
      })
    );

    // Ordenar por puntuación y asignar posición
    const ranking = empleadosConMetricas
      .sort((a, b) => b.puntuacionTotal - a.puntuacionTotal)
      .map((empleado, index) => ({
        posicion: index + 1,
        empleadoId: empleado.empleadoId,
        nombre: empleado.nombre,
        foto: empleado.foto || undefined,
        cargo: empleado.cargo,
        totalCitas: empleado.totalCitas,
        ingresoGenerado: empleado.ingresoTotal,
        tasaCompletacion: empleado.tasaCompletacion,
        tasaUtilizacion: empleado.tasaUtilizacion,
        ingresoPorHora: empleado.ingresoPorHora,
        puntuacionTotal: empleado.puntuacionTotal,
      }));

    return ranking;
  }

  /**
   * 4. Obtener horas pico (análisis de demanda)
   * Identifica los días y horas con mayor actividad
   */
  async getHorasPico(negocioId: string, filtros: FiltrosReportesDto): Promise<HorasPico> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Obtener todas las citas (no solo completadas, para ver demanda real)
    const citas = await this.prisma.cita.findMany({
      where,
      select: {
        fecha: true,
        horaInicio: true,
        precioTotal: true,
      },
    });

    if (citas.length === 0) {
      return {
        diaMasConcurrido: 'Sin datos',
        diaMasConcurridoCitas: 0,
        horaMasConcurrida: 'Sin datos',
        horaMasConcurridaCitas: 0,
        citasPorDia: [],
        citasPorHora: [],
        horasMenosConcurridas: [],
        recomendaciones: [],
      };
    }

    // Agrupar por día de la semana
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const citasPorDiaMap = citas.reduce((acc, cita) => {
      const dia = diasSemana[cita.fecha.getDay()];
      if (!acc[dia]) {
        acc[dia] = { citas: 0, ingresos: 0 };
      }
      acc[dia].citas += 1;
      acc[dia].ingresos += Number(cita.precioTotal);
      return acc;
    }, {} as Record<string, { citas: number; ingresos: number }>);

    const citasPorDia = Object.entries(citasPorDiaMap)
      .map(([dia, data]) => ({
        dia,
        citas: data.citas,
        ingresos: Math.round(data.ingresos * 100) / 100,
      }))
      .sort((a, b) => b.citas - a.citas);

    const diaMasConcurrido = citasPorDia[0]?.dia || 'Sin datos';

    // Agrupar por hora del día
    const citasPorHoraMap = citas.reduce((acc, cita) => {
      const [hora] = cita.horaInicio.split(':');
      const horaKey = `${hora}:00`;
      if (!acc[horaKey]) {
        acc[horaKey] = { citas: 0, ingresos: 0 };
      }
      acc[horaKey].citas += 1;
      acc[horaKey].ingresos += Number(cita.precioTotal);
      return acc;
    }, {} as Record<string, { citas: number; ingresos: number }>);

    const citasPorHora = Object.entries(citasPorHoraMap)
      .map(([hora, data]) => ({
        hora,
        citas: data.citas,
        ingresos: Math.round(data.ingresos * 100) / 100,
      }))
      .sort((a, b) => b.citas - a.citas);

    const horaMasConcurrida = citasPorHora[0]?.hora || 'Sin datos';
    const horaMasConcurridaCitas = citasPorHora[0]?.citas || 0;

    // Identificar horas menos concurridas (con menos del 20% de la demanda promedio)
    const promedioCitasPorHora = citasPorHora.reduce((sum, h) => sum + h.citas, 0) / citasPorHora.length;
    const horasMenosConcurridas = citasPorHora
      .filter(h => h.citas < promedioCitasPorHora * 0.2)
      .map(h => h.hora);

    // Generar recomendaciones
    const recomendaciones: string[] = [];
    
    if (citasPorDia.length > 0) {
      const mejoresDias = citasPorDia.slice(0, 3).map(d => d.dia).join(', ');
      recomendaciones.push(`Días con mayor demanda: ${mejoresDias}`);
    }

    if (citasPorHora.length > 0) {
      const mejoresHoras = citasPorHora.slice(0, 3).map(h => h.hora).join(', ');
      recomendaciones.push(`Horarios más solicitados: ${mejoresHoras}`);
    }

    // Identificar días/horas con poca demanda
    const peoresDias = citasPorDia.slice(-2).map(d => d.dia);
    if (peoresDias.length > 0) {
      recomendaciones.push(`Considera promociones para: ${peoresDias.join(', ')}`);
    }

    return {
      diaMasConcurrido,
      diaMasConcurridoCitas: citasPorDia[0]?.citas || 0,
      horaMasConcurrida,
      horaMasConcurridaCitas,
      citasPorDia,
      citasPorHora,
      horasMenosConcurridas,
      recomendaciones,
    };
  }

  /**
   * 5. Calcular valor de vida del cliente (CLV)
   * Análisis de clientes nuevos vs recurrentes
   */
  async getValorVidaCliente(negocioId: string, filtros: FiltrosReportesDto): Promise<ValorVidaCliente> {
    const where = this.buildWhereClause(negocioId, filtros);

    // Obtener todas las citas completadas
    const citasCompletadas = await this.prisma.cita.findMany({
      where: {
        ...where,
        estado: 'COMPLETADA',
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (citasCompletadas.length === 0) {
      return {
        clv: 0,
        clientesTotales: 0,
        clientesNuevos: 0,
        clientesRecurrentes: 0,
        tasaRetencion: 0,
        frecuenciaPromedio: 0,
        ticketPromedio: 0,
        topClientes: [],
      };
    }

    // Agrupar por cliente
    const clientesMap = citasCompletadas.reduce((acc, cita) => {
      const clienteId = cita.cliente.id;
      if (!acc[clienteId]) {
        acc[clienteId] = {
          id: clienteId,
          nombre: cita.cliente.nombre,
          totalCitas: 0,
          totalGastado: 0,
        };
      }
      acc[clienteId].totalCitas += 1;
      acc[clienteId].totalGastado += Number(cita.precioTotal);
      return acc;
    }, {} as Record<string, { id: string; nombre: string; totalCitas: number; totalGastado: number }>);

    const clientes = Object.values(clientesMap);

    // Identificar clientes nuevos (1 cita) vs recurrentes (>1 cita)
    const clientesNuevos = clientes.filter(c => c.totalCitas === 1).length;
    const clientesRecurrentes = clientes.filter(c => c.totalCitas > 1).length;
    const totalClientes = clientes.length;

    // Calcular CLV (gasto promedio por cliente)
    const gastoTotal = clientes.reduce((sum, c) => sum + c.totalGastado, 0);
    const clv = totalClientes > 0 ? gastoTotal / totalClientes : 0;

    // Tasa de retención (% de clientes que volvieron)
    const tasaRetencion = totalClientes > 0 ? (clientesRecurrentes / totalClientes) * 100 : 0;

    // Frecuencia promedio (citas por cliente)
    const totalCitasCount = clientes.reduce((sum, c) => sum + c.totalCitas, 0);
    const frecuenciaPromedio = totalClientes > 0 ? totalCitasCount / totalClientes : 0;

    // Ticket promedio (gasto promedio por cita)
    const ticketPromedio = totalCitasCount > 0 ? gastoTotal / totalCitasCount : 0;

    // Top 10 clientes por gasto
    const topClientes = clientes
      .sort((a, b) => b.totalGastado - a.totalGastado)
      .slice(0, 10)
      .map(c => ({
        clienteId: c.id,
        nombre: c.nombre,
        totalGastado: Math.round(c.totalGastado * 100) / 100,
        totalCitas: c.totalCitas,
      }));

    return {
      clv: Math.round(clv * 100) / 100,
      clientesTotales: totalClientes,
      clientesNuevos,
      clientesRecurrentes,
      tasaRetencion: Math.round(tasaRetencion * 100) / 100,
      frecuenciaPromedio: Math.round(frecuenciaPromedio * 100) / 100,
      ticketPromedio: Math.round(ticketPromedio * 100) / 100,
      topClientes,
    };
  }
}
