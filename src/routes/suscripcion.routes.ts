// src/routes/suscripcion.routes.ts

import { FastifyInstance } from 'fastify';
import { SuscripcionController } from '../controllers/suscripcion.controller';
import { SuscripcionService } from '../services/suscripcion.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../database/prisma';

export async function suscripcionRoutes(fastify: FastifyInstance) {
  // ✅ Dependency Injection - Una sola instancia por aplicación
  const service = new SuscripcionService(prisma);
  const controller = new SuscripcionController(service);

  // POST /api/suscripciones/activar-codigo - Activar código de suscripción
  fastify.post(
    '/activar-codigo',
    { preHandler: [authMiddleware] },
    controller.activarCodigo
  );

  // GET /api/suscripciones/mi-suscripcion - Obtener suscripción actual
  fastify.get(
    '/mi-suscripcion',
    { preHandler: [authMiddleware] },
    controller.obtenerMiSuscripcion
  );

  // ✅ OPTIMIZACIÓN: Eliminado endpoint duplicado /verificar-estado
  // Usar /mi-suscripcion que hace lo mismo
}
