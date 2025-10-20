// src/routes/sucursal.routes.ts

import { FastifyInstance } from 'fastify';
import { SucursalController } from '../controllers/sucursal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export async function sucursalRoutes(fastify: FastifyInstance) {
  const sucursalController = new SucursalController();

  // Obtener todas las sucursales del negocio
  fastify.get(
    '/sucursales',
    { preHandler: [authMiddleware] },
    sucursalController.obtenerSucursales.bind(sucursalController)
  );

  // Obtener una sucursal por ID
  fastify.get(
    '/sucursales/:id',
    { preHandler: [authMiddleware] },
    sucursalController.obtenerSucursalPorId.bind(sucursalController)
  );
}
