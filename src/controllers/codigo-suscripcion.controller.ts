// src/controllers/codigo-suscripcion.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { CodigoSuscripcionService } from '../services/codigo-suscripcion.service';
import {
  CreateCodigoSuscripcionDto,
  GenerarCodigosDto,
  CodigoSuscripcionFilters,
} from '../models/codigo-suscripcion.model';
import { PlanSuscripcion } from '@prisma/client';

export class CodigoSuscripcionController {
  constructor(private service: CodigoSuscripcionService) {}

  /**
   * POST /api/codigos-suscripcion
   * Crear un código de suscripción
   */
  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dto = request.body as CreateCodigoSuscripcionDto;

      const codigo = await this.service.create(dto);

      return reply.status(201).send({
        success: true,
        data: codigo,
        message: 'Código de suscripción creado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear código de suscripción',
      });
    }
  };

  /**
   * POST /api/codigos-suscripcion/generar-multiples
   * Generar múltiples códigos a la vez
   */
  generarMultiples = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dto = request.body as GenerarCodigosDto;

      const codigos = await this.service.generarMultiples(dto);

      return reply.status(201).send({
        success: true,
        data: codigos,
        message: `${codigos.length} códigos generados exitosamente`,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al generar códigos',
      });
    }
  };

  /**
   * GET /api/codigos-suscripcion
   * Listar códigos con filtros y paginación
   */
  getAll = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;

      const filters: CodigoSuscripcionFilters = {
        plan: query.plan as PlanSuscripcion | undefined,
        usado: query.usado === 'true' ? true : query.usado === 'false' ? false : undefined,
        expirado: query.expirado === 'true',
        disponible: query.disponible === 'true',
        search: query.search,
      };

      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 20;

      const result = await this.service.getAll(filters, page, limit);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener códigos',
      });
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      await this.service.delete(id);

      return reply.status(200).send({
        success: true,
        message: 'Código eliminado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar código',
      });
    }
  };

  getEstadisticas = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await this.service.getEstadisticas();

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
}
