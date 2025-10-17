// src/controllers/suscripcion.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { SuscripcionService } from '../services/suscripcion.service';
import { ActivarCodigoDto } from '../models/suscripcion.model';

export class SuscripcionController {
  constructor(private readonly service: SuscripcionService) {}

  /**
   * POST /api/suscripciones/activar-codigo
   * Activar código de suscripción para el usuario autenticado
   */
  activarCodigo = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const dto = request.body as ActivarCodigoDto;

      // Validar que se envíe el código
      if (!dto.codigo) {
        return reply.status(400).send({
          success: false,
          message: 'El código es requerido',
        });
      }

      const response = await this.service.activarCodigo(userId, dto);

      return reply.status(200).send(response);
    } catch (error: any) {
      console.error('Error al activar código:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al activar código',
      });
    }
  };

  /**
   * GET /api/suscripciones/mi-suscripcion
   * Obtener información de la suscripción del usuario autenticado
   * También verifica y actualiza el estado si es necesario
   */
  obtenerMiSuscripcion = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;

      const response = await this.service.obtenerSuscripcionActual(userId);

      return reply.status(200).send(response);
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Suscripción no encontrada',
      });
    }
  };
}
