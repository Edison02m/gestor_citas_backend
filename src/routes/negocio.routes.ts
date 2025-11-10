// src/routes/negocio.routes.ts

import { FastifyInstance } from 'fastify';
import { NegocioController } from '../controllers/negocio.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export async function negocioRoutes(fastify: FastifyInstance) {
  const negocioController = new NegocioController();

  // Todas las rutas requieren autenticación
  fastify.addHook('preHandler', authMiddleware);

  // Obtener información del negocio
  fastify.get(
    '/negocio',
    negocioController.obtenerNegocio.bind(negocioController)
  );

  // Actualizar información básica del negocio
  fastify.put(
    '/negocio',
    negocioController.actualizarNegocio.bind(negocioController)
  );

  // Actualizar agenda pública (link, habilitación)
  fastify.put(
    '/negocio/agenda-publica',
    negocioController.actualizarAgendaPublica.bind(negocioController)
  );

  // Actualizar notificaciones y recordatorios
  fastify.put(
    '/negocio/notificaciones',
    negocioController.actualizarNotificaciones.bind(negocioController)
  );

  // Actualizar mensajes personalizables de WhatsApp
  fastify.put(
    '/negocio/mensajes-whatsapp',
    negocioController.actualizarMensajesWhatsApp.bind(negocioController)
  );

  // Generar link público automático
  fastify.post(
    '/negocio/generar-link',
    negocioController.generarLinkPublico.bind(negocioController)
  );

  // Actualizar logo del negocio
  fastify.patch(
    '/negocio/logo',
    negocioController.actualizarLogo.bind(negocioController)
  );
}
