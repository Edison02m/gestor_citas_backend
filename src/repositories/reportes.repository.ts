// src/repositories/reportes.repository.ts

import { PrismaClient, Prisma } from '@prisma/client';
import {
  FiltrosReportesDto,
  PeriodoStats,
  ClienteFrecuente,
  ServicioVendido,
  DatoTemporal,
  OcupacionEmpleado,
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
}
