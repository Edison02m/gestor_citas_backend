// src/routes/sucursal.routes.ts

import { FastifyInstance } from 'fastify';
import { SucursalController } from '../controllers/sucursal.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export async function sucursalRoutes(fastify: FastifyInstance) {
  const sucursalController = new SucursalController();

  // Todas las rutas requieren autenticación
  fastify.addHook('preHandler', authMiddleware);

  // Obtener todas las sucursales del negocio
  fastify.get(
    '/sucursales',
    sucursalController.obtenerSucursales.bind(sucursalController)
  );

  // Obtener una sucursal por ID
  fastify.get(
    '/sucursales/:id',
    sucursalController.obtenerSucursalPorId.bind(sucursalController)
  );

  // Crear nueva sucursal
  fastify.post(
    '/sucursales',
    sucursalController.crearSucursal.bind(sucursalController)
  );

  // Actualizar datos generales de la sucursal
  fastify.put(
    '/sucursales/:id',
    sucursalController.actualizarSucursal.bind(sucursalController)
  );

  // Actualizar horarios de la sucursal
  fastify.put(
    '/sucursales/:id/horarios',
    sucursalController.actualizarHorarios.bind(sucursalController)
  );

  // Eliminar sucursal
  fastify.delete(
    '/sucursales/:id',
    sucursalController.eliminarSucursal.bind(sucursalController)
  );
}
