// src/routes/cliente.routes.ts

import { FastifyInstance } from 'fastify';
import { ClienteService } from '../services/cliente.service';
import { ClienteController } from '../controllers/cliente.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../database/prisma';

export async function clienteRoutes(fastify: FastifyInstance) {
  const clienteService = new ClienteService(prisma);
  const clienteController = new ClienteController(clienteService);

  // Todas las rutas requieren autenticación
  fastify.addHook('preHandler', authMiddleware);

  // CRUD de clientes
  fastify.get('/', clienteController.listar);
  fastify.post('/', clienteController.crear);
  fastify.put('/:id', clienteController.actualizar);
  fastify.delete('/:id', clienteController.eliminar);
}
