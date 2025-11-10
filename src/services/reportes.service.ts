// src/services/reportes.service.ts

import { PrismaClient } from '@prisma/client';
import { ReportesRepository } from '../repositories/reportes.repository';
import {
  FiltrosReportesDto,
  DashboardStats,
  DashboardReportesResponse,
  ComparacionPeriodo,
  ClienteFrecuente,
  ServicioVendido,
  DatoTemporal,
  OcupacionEmpleado,
} from '../models/reportes.model';

export class ReportesService {
  private repository: ReportesRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new ReportesRepository(prisma);
  }

  /**
   * Helper para calcular el período anterior
   */
  private calcularPeriodoAnterior(fechaInicio: string, fechaFin: string): { inicio: string; fin: string } {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    // Calcular duración del período
    const duracionMs = fin.getTime() - inicio.getTime();

    // Calcular período anterior
    const finAnterior = new Date(inicio.getTime() - 1); // Un día antes del inicio
    const inicioAnterior = new Date(finAnterior.getTime() - duracionMs);

    return {
      inicio: inicioAnterior.toISOString().split('T')[0],
      fin: finAnterior.toISOString().split('T')[0],
    };
  }

  /**
   * Helper para calcular variación porcentual
   */
  private calcularVariacion(actual: number, anterior: number): string {
    if (anterior === 0) {
      return actual > 0 ? '+100%' : '0%';
    }

    const variacion = ((actual - anterior) / anterior) * 100;
    const signo = variacion >= 0 ? '+' : '';
    return `${signo}${Math.round(variacion)}%`;
  }

  /**
   * Obtener dashboard completo con todas las métricas principales
   */
  async getDashboardCompleto(negocioId: string, filtros: FiltrosReportesDto): Promise<DashboardReportesResponse> {
    // Si no hay fechas, usar mes actual por defecto
    if (!filtros.fechaInicio || !filtros.fechaFin) {
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

      filtros.fechaInicio = primerDiaMes.toISOString().split('T')[0];
      filtros.fechaFin = ultimoDiaMes.toISOString().split('T')[0];
    }

    // Ejecutar todas las queries en paralelo (incluyendo nuevas estadísticas)
    const [
      periodoActual,
      clientesFrecuentes,
      serviciosMasVendidos,
      citasPorDia,
      tasaUtilizacion,
      ingresosPorHora,
      rankingEmpleados,
      horasPico,
      valorVidaCliente,
    ] = await Promise.all([
      this.repository.getDashboardStats(negocioId, filtros),
      this.repository.getClientesFrecuentes(negocioId, filtros, 10),
      this.repository.getServiciosMasVendidos(negocioId, filtros, 10),
      this.repository.getCitasPorDia(negocioId, filtros),
      this.repository.getTasaUtilizacion(negocioId, filtros),
      this.repository.getIngresosPorHora(negocioId, filtros),
      this.repository.getRankingEmpleados(negocioId, filtros),
      this.repository.getHorasPico(negocioId, filtros),
      this.repository.getValorVidaCliente(negocioId, filtros),
    ]);

    // Calcular comparación con período anterior
    let comparacionPeriodoAnterior: ComparacionPeriodo | undefined;

    if (filtros.fechaInicio && filtros.fechaFin) {
      const periodoAnteriorFechas = this.calcularPeriodoAnterior(filtros.fechaInicio, filtros.fechaFin);

      const periodoAnterior = await this.repository.getDashboardStats(negocioId, {
        ...filtros,
        fechaInicio: periodoAnteriorFechas.inicio,
        fechaFin: periodoAnteriorFechas.fin,
      });

      comparacionPeriodoAnterior = {
        variacionCitas: this.calcularVariacion(periodoActual.totalCitas, periodoAnterior.totalCitas),
        variacionIngresos: this.calcularVariacion(periodoActual.ingresoTotal, periodoAnterior.ingresoTotal),
        variacionTasaAsistencia: this.calcularVariacion(
          periodoActual.tasaAsistencia,
          periodoAnterior.tasaAsistencia
        ),
      };
    }

    const dashboard: DashboardStats = {
      periodoActual,
      comparacionPeriodoAnterior,
    };

    return {
      dashboard,
      clientesFrecuentes,
      serviciosMasVendidos,
      citasPorDia,
      // Nuevas estadísticas
      tasaUtilizacion,
      ingresosPorHora: [ingresosPorHora], // Convertir a array para compatibilidad con interfaz
      rankingEmpleados,
      horasPico,
      valorVidaCliente,
    };
  }

  /**
   * Obtener solo estadísticas del dashboard
   */
  async getDashboardStats(negocioId: string, filtros: FiltrosReportesDto): Promise<DashboardStats> {
    // Si no hay fechas, usar mes actual por defecto
    if (!filtros.fechaInicio || !filtros.fechaFin) {
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

      filtros.fechaInicio = primerDiaMes.toISOString().split('T')[0];
      filtros.fechaFin = ultimoDiaMes.toISOString().split('T')[0];
    }

    const periodoActual = await this.repository.getDashboardStats(negocioId, filtros);

    // Calcular comparación con período anterior
    let comparacionPeriodoAnterior: ComparacionPeriodo | undefined;

    if (filtros.fechaInicio && filtros.fechaFin) {
      const periodoAnteriorFechas = this.calcularPeriodoAnterior(filtros.fechaInicio, filtros.fechaFin);

      const periodoAnterior = await this.repository.getDashboardStats(negocioId, {
        ...filtros,
        fechaInicio: periodoAnteriorFechas.inicio,
        fechaFin: periodoAnteriorFechas.fin,
      });

      comparacionPeriodoAnterior = {
        variacionCitas: this.calcularVariacion(periodoActual.totalCitas, periodoAnterior.totalCitas),
        variacionIngresos: this.calcularVariacion(periodoActual.ingresoTotal, periodoAnterior.ingresoTotal),
        variacionTasaAsistencia: this.calcularVariacion(
          periodoActual.tasaAsistencia,
          periodoAnterior.tasaAsistencia
        ),
      };
    }

    return {
      periodoActual,
      comparacionPeriodoAnterior,
    };
  }

  /**
   * Obtener clientes frecuentes
   */
  async getClientesFrecuentes(
    negocioId: string,
    filtros: FiltrosReportesDto,
    limit: number = 10
  ): Promise<ClienteFrecuente[]> {
    return await this.repository.getClientesFrecuentes(negocioId, filtros, limit);
  }

  /**
   * Obtener servicios más vendidos
   */
  async getServiciosMasVendidos(
    negocioId: string,
    filtros: FiltrosReportesDto,
    limit: number = 10
  ): Promise<ServicioVendido[]> {
    return await this.repository.getServiciosMasVendidos(negocioId, filtros, limit);
  }

  /**
   * Obtener análisis temporal (citas por día)
   */
  async getCitasPorDia(negocioId: string, filtros: FiltrosReportesDto): Promise<DatoTemporal[]> {
    return await this.repository.getCitasPorDia(negocioId, filtros);
  }

  /**
   * Obtener ocupación de empleados
   */
  async getOcupacionEmpleados(negocioId: string, filtros: FiltrosReportesDto): Promise<OcupacionEmpleado[]> {
    return await this.repository.getOcupacionEmpleados(negocioId, filtros);
  }
}
