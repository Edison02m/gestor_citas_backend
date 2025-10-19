// src/routes/codigo-suscripcion.routes.ts

import { FastifyInstance } from 'fastify';
import { CodigoSuscripcionController } from '../controllers/codigo-suscripcion.controller';
import { CodigoSuscripcionService } from '../services/codigo-suscripcion.service';
import { CodigoSuscripcionRepository } from '../repositories/codigo-suscripcion.repository';
import prisma from '../database/prisma';
import { authMiddleware, superAdminMiddleware } from '../middlewares/auth.middleware';

export async function codigoSuscripcionRoutes(fastify: FastifyInstance) {
  // Inicializar capas
  const repository = new CodigoSuscripcionRepository(prisma);
  const service = new CodigoSuscripcionService(repository);
  const controller = new CodigoSuscripcionController(service);

  // Todas las rutas requieren autenticación de SuperAdmin
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', superAdminMiddleware);

  fastify.get('/estadisticas', controller.getEstadisticas);

  fastify.post('/', controller.create);

  fastify.post('/generar-multiples', controller.generarMultiples);

  fastify.get('/', controller.getAll);

  fastify.delete('/:id', controller.delete);
}
