// src/controllers/envios.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import enviosService from '../services/envios.service';

export class EnviosController {
  /**
   * GET /api/envios/estadisticas
   * Obtiene las estadísticas de envíos del mes actual para el negocio autenticado
   */
  obtenerEstadisticasMes = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      // Obtener estadísticas de envíos del mes
      const estadisticas = await enviosService.obtenerEstadisticasMes(negocioId);

      return reply.status(200).send({
        success: true,
        data: estadisticas,
      });
    } catch (error: any) {
      console.error('Error al obtener estadísticas de envíos:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener estadísticas de envíos',
        error: error.message,
      });
    }
  };

  /**
   * GET /api/envios/validar-email
   * Valida si puede enviar un email (no ha alcanzado el límite)
   */
  validarEmail = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      const resultado = await enviosService.puedeEnviarEmail(negocioId);

      return reply.status(200).send({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Error al validar email:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al validar límite de emails',
        error: error.message,
      });
    }
  };

  /**
   * GET /api/envios/validar-whatsapp
   * Valida si puede enviar un WhatsApp (no ha alcanzado el límite)
   */
  validarWhatsApp = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      const resultado = await enviosService.puedeEnviarWhatsApp(negocioId);

      return reply.status(200).send({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Error al validar WhatsApp:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al validar límite de WhatsApp',
        error: error.message,
      });
    }
  };
}

export default new EnviosController();
