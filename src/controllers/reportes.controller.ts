// src/controllers/reportes.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { ReportesService } from '../services/reportes.service';
import { FiltrosReportesDto } from '../models/reportes.model';

export class ReportesController {
  constructor(private service: ReportesService) {}

  /**
   * GET /api/reportes/dashboard
   * Obtener dashboard completo con todas las métricas principales
   */
  getDashboardCompleto = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const filtros = request.query as FiltrosReportesDto;

      const dashboard = await this.service.getDashboardCompleto(user.negocioId, filtros);

      return reply.status(200).send({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener dashboard de reportes',
      });
    }
  };

  /**
   * GET /api/reportes/dashboard/stats
   * Obtener solo estadísticas del dashboard
   */
  getDashboardStats = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const filtros = request.query as FiltrosReportesDto;

      const stats = await this.service.getDashboardStats(user.negocioId, filtros);

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener estadísticas',
      });
    }
  };

  /**
   * GET /api/reportes/clientes-frecuentes
   * Obtener clientes frecuentes
   */
  getClientesFrecuentes = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { limit, ...filtros } = request.query as FiltrosReportesDto & { limit?: string };

      const limitNumber = limit ? parseInt(limit, 10) : 10;

      const clientes = await this.service.getClientesFrecuentes(user.negocioId, filtros, limitNumber);

      return reply.status(200).send({
        success: true,
        data: clientes,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener clientes frecuentes',
      });
    }
  };

  /**
   * GET /api/reportes/servicios-vendidos
   * Obtener servicios más vendidos
   */
  getServiciosMasVendidos = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { limit, ...filtros } = request.query as FiltrosReportesDto & { limit?: string };

      const limitNumber = limit ? parseInt(limit, 10) : 10;

      const servicios = await this.service.getServiciosMasVendidos(user.negocioId, filtros, limitNumber);

      return reply.status(200).send({
        success: true,
        data: servicios,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener servicios más vendidos',
      });
    }
  };

  /**
   * GET /api/reportes/citas-por-dia
   * Obtener análisis temporal (citas por día)
   */
  getCitasPorDia = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const filtros = request.query as FiltrosReportesDto;

      const datos = await this.service.getCitasPorDia(user.negocioId, filtros);

      return reply.status(200).send({
        success: true,
        data: datos,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener citas por día',
      });
    }
  };

  /**
   * GET /api/reportes/ocupacion-empleados
   * Obtener ocupación de empleados
   */
  getOcupacionEmpleados = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const filtros = request.query as FiltrosReportesDto;

      const empleados = await this.service.getOcupacionEmpleados(user.negocioId, filtros);

      return reply.status(200).send({
        success: true,
        data: empleados,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener ocupación de empleados',
      });
    }
  };
}
