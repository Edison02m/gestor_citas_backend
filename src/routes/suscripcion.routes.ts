// src/routes/suscripcion.routes.ts

import { FastifyInstance } from 'fastify';
import { SuscripcionController } from '../controllers/suscripcion.controller';
import { SuscripcionService } from '../services/suscripcion.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../database/prisma';

export async function suscripcionRoutes(fastify: FastifyInstance) {
  const service = new SuscripcionService(prisma);
  const controller = new SuscripcionController(service);

  fastify.post(
    '/activar-codigo',
    { preHandler: [authMiddleware] },
    controller.activarCodigo
  );
}
