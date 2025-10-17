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

  // Rutas de estadísticas (antes de las rutas con parámetros)
  fastify.get('/estadisticas', controller.getEstadisticas);
  fastify.get('/proximos-vencer', controller.getProximosAVencer);

  // Crear código
  fastify.post('/', controller.create);

  // Generar múltiples códigos
  fastify.post('/generar-multiples', controller.generarMultiples);

  // Listar códigos
  fastify.get('/', controller.getAll);

  // Validar disponibilidad
  fastify.post('/validar/:codigo', controller.validarDisponibilidad);

  // Obtener código por código de texto
  fastify.get('/codigo/:codigo', controller.getByCodigo);

  // Obtener código por ID
  fastify.get('/:id', controller.getById);

  // Actualizar código
  fastify.put('/:id', controller.update);

  // Eliminar código
  fastify.delete('/:id', controller.delete);
}
