// src/controllers/planes.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import planesService from '../services/planes.service';
import limitesService from '../services/limites.service';
import usoRecursosService from '../services/uso-recursos.service';
import { PlanSuscripcion } from '@prisma/client';

interface CambiarPlanRequest {
  Body: {
    nuevoPlan: PlanSuscripcion;
  };
}

interface HistorialUsoRequest {
  Querystring: {
    meses?: string;
  };
}

export class PlanesController {
  /**
   * GET /api/planes
   * Obtener todos los planes disponibles con sus características y precios
   */
  async obtenerPlanesDisponibles(
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const planes = await planesService.obtenerPlanesDisponibles();

      return reply.status(200).send({
        success: true,
        data: planes,
      });
    } catch (error: any) {
      console.error('Error al obtener planes:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener planes disponibles',
      });
    }
  }

  /**
   * GET /api/negocio/plan-actual
   * Obtener información del plan actual del negocio
   */
  async obtenerPlanActual(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'Usuario no asociado a un negocio',
        });
      }

      const planActual = await planesService.obtenerPlanActual(negocioId);

      return reply.status(200).send({
        success: true,
        data: planActual,
      });
    } catch (error: any) {
      console.error('Error al obtener plan actual:', error);
      
      if (error.message === 'Negocio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Error al obtener información del plan actual',
      });
    }
  }

  /**
   * GET /api/negocio/uso
   * Obtener el resumen de uso de recursos del negocio
   */
  async obtenerResumenUso(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'Usuario no asociado a un negocio',
        });
      }

      const resumen = await limitesService.obtenerResumenLimites(negocioId);

      return reply.status(200).send({
        success: true,
        data: resumen,
      });
    } catch (error: any) {
      console.error('Error al obtener resumen de uso:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener resumen de uso',
      });
    }
  }

  /**
   * GET /api/negocio/uso/historial
   * Obtener el historial de uso de recursos
   */
  async obtenerHistorialUso(
    request: FastifyRequest<HistorialUsoRequest>,
    reply: FastifyReply
  ) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'Usuario no asociado a un negocio',
        });
      }

      const meses = request.query.meses ? parseInt(request.query.meses) : 6;

      const historial = await usoRecursosService.obtenerHistorialUso(
        negocioId,
        meses
      );

      return reply.status(200).send({
        success: true,
        data: historial,
      });
    } catch (error: any) {
      console.error('Error al obtener historial de uso:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener historial de uso',
      });
    }
  }

  /**
   * POST /api/suscripcion/cambiar-plan
   * Cambiar el plan de suscripción del negocio
   */
  async cambiarPlan(
    request: FastifyRequest<CambiarPlanRequest>,
    reply: FastifyReply
  ) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { nuevoPlan } = request.body;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'Usuario no asociado a un negocio',
        });
      }

      if (!nuevoPlan) {
        return reply.status(400).send({
          success: false,
          message: 'El campo nuevoPlan es requerido',
        });
      }

      // Validar que el plan sea válido
      const planesValidos = Object.values(PlanSuscripcion);
      if (!planesValidos.includes(nuevoPlan)) {
        return reply.status(400).send({
          success: false,
          message: `Plan inválido. Planes válidos: ${planesValidos.join(', ')}`,
        });
      }

      const resultado = await planesService.cambiarPlan(negocioId, nuevoPlan);

      return reply.status(200).send({
        success: true,
        message: 'Plan cambiado exitosamente',
        data: resultado,
      });
    } catch (error: any) {
      console.error('Error al cambiar plan:', error);

      if (error.message === 'Negocio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes('No puedes cambiar a un plan gratuito')) {
        return reply.status(400).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: 'Error al cambiar plan de suscripción',
      });
    }
  }

  /**
   * GET /api/negocio/uso/actual
   * Obtener el uso actual del mes
   */
  async obtenerUsoActual(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'Usuario no asociado a un negocio',
        });
      }

      const usoActual = await usoRecursosService.obtenerUsoActual(negocioId);

      return reply.status(200).send({
        success: true,
        data: usoActual,
      });
    } catch (error: any) {
      console.error('Error al obtener uso actual:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener uso actual',
      });
    }
  }
}
