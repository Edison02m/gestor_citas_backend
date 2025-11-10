// src/routes/envios.routes.ts

import { FastifyInstance } from 'fastify';
import enviosController from '../controllers/envios.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarSuscripcionMiddleware } from '../middlewares/verificar-suscripcion.middleware';

export async function enviosRoutes(fastify: FastifyInstance) {
  // Todas las rutas requieren autenticación y suscripción activa
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', verificarSuscripcionMiddleware);

  // ============================================================================
  // Estadísticas de Envíos
  // ============================================================================

  /**
   * GET /api/envios/estadisticas
   * Obtiene las estadísticas de envíos del mes actual (emails y WhatsApp)
   * Retorna: { emails: {usado, limite, porcentaje}, whatsapp: {usado, limite, porcentaje} }
   */
  fastify.get('/estadisticas', enviosController.obtenerEstadisticasMes);

  /**
   * GET /api/envios/validar-email
   * Valida si puede enviar un email sin alcanzar el límite
   * Retorna: { permitido: boolean, usado: number, limite: number | null, mensaje?: string }
   */
  fastify.get('/validar-email', enviosController.validarEmail);

  /**
   * GET /api/envios/validar-whatsapp
   * Valida si puede enviar un WhatsApp sin alcanzar el límite
   * Retorna: { permitido: boolean, usado: number, limite: number | null, mensaje?: string }
   */
  fastify.get('/validar-whatsapp', enviosController.validarWhatsApp);
}
