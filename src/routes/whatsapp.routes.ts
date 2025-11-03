// src/routes/whatsapp.routes.ts

import { FastifyInstance } from 'fastify';
import {
  vincularWhatsApp,
  obtenerEstado,
  obtenerNuevoQR,
  desvincularWhatsApp,
  webhookEvolution,
  verificarNumero,
} from '../controllers/whatsapp.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export async function whatsappRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // RUTAS AUTENTICADAS (requieren JWT)
  // ============================================================================

  // POST /api/whatsapp/vincular
  // Vincular WhatsApp (crear instancia y obtener QR)
  fastify.post('/vincular', {
    preHandler: [authMiddleware],
    handler: vincularWhatsApp,
  });

  // GET /api/whatsapp/estado
  // Obtener estado de conexión de WhatsApp
  fastify.get('/estado', {
    preHandler: [authMiddleware],
    handler: obtenerEstado,
  });

  // GET /api/whatsapp/qr
  // Obtener nuevo código QR
  fastify.get('/qr', {
    preHandler: [authMiddleware],
    handler: obtenerNuevoQR,
  });

  // POST /api/whatsapp/desvincular
  // Desvincular WhatsApp
  fastify.post('/desvincular', {
    preHandler: [authMiddleware],
    handler: desvincularWhatsApp,
  });

  // POST /api/whatsapp/check-number
  // Verificar si un número tiene WhatsApp
  fastify.post('/check-number', {
    preHandler: [authMiddleware],
    handler: verificarNumero,
  });

  // ============================================================================
  // RUTAS PÚBLICAS (sin autenticación, pero con validación de API Key)
  // ============================================================================

  // POST /api/whatsapp/webhook
  // Recibir eventos de Evolution API
  fastify.post('/webhook', webhookEvolution);
}
