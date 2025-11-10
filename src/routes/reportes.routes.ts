// src/routes/reportes.routes.ts

import { FastifyInstance } from 'fastify';
import { ReportesService } from '../services/reportes.service';
import { ReportesController } from '../controllers/reportes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarSuscripcionMiddleware } from '../middlewares/verificar-suscripcion.middleware';
import prisma from '../database/prisma';

export async function reportesRoutes(fastify: FastifyInstance) {
  const reportesService = new ReportesService(prisma);
  const reportesController = new ReportesController(reportesService);

  // Todas las rutas requieren autenticación y suscripción activa
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', verificarSuscripcionMiddleware);

  // ============================================================================
  // ENDPOINTS DE REPORTES Y ESTADÍSTICAS
  // ============================================================================

  /**
   * GET /api/reportes/dashboard-completo
   * Obtener dashboard completo con todas las métricas principales
   * Query params: fechaInicio, fechaFin, empleadoId, servicioId, sucursalId, clienteId
   */
  fastify.get('/dashboard-completo', reportesController.getDashboardCompleto);

  /**
   * GET /api/reportes/dashboard/stats
   * Obtener solo estadísticas del dashboard (sin listas detalladas)
   * Query params: fechaInicio, fechaFin, empleadoId, servicioId, sucursalId, clienteId
   */
  fastify.get('/dashboard/stats', reportesController.getDashboardStats);

  /**
   * GET /api/reportes/clientes-frecuentes
   * Obtener clientes frecuentes (top N)
   * Query params: fechaInicio, fechaFin, limit (default: 10)
   */
  fastify.get('/clientes-frecuentes', reportesController.getClientesFrecuentes);

  /**
   * GET /api/reportes/servicios-vendidos
   * Obtener servicios más vendidos (top N)
   * Query params: fechaInicio, fechaFin, limit (default: 10)
   */
  fastify.get('/servicios-vendidos', reportesController.getServiciosMasVendidos);

  /**
   * GET /api/reportes/citas-por-dia
   * Obtener análisis temporal (citas por día)
   * Query params: fechaInicio, fechaFin, empleadoId, servicioId, sucursalId
   */
  fastify.get('/citas-por-dia', reportesController.getCitasPorDia);

  /**
   * GET /api/reportes/ocupacion-empleados
   * Obtener ocupación de empleados
   * Query params: fechaInicio, fechaFin, empleadoId
   */
  fastify.get('/ocupacion-empleados', reportesController.getOcupacionEmpleados);
}
