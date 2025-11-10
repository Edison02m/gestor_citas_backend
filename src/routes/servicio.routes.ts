// src/routes/servicio.routes.ts

import { FastifyInstance } from 'fastify';
import { ServicioController } from '../controllers/servicio.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export async function servicioRoutes(fastify: FastifyInstance) {
  const servicioController = new ServicioController();

  // Todas las rutas requieren autenticación
  fastify.addHook('preHandler', authMiddleware);

  // ============================================================================
  // RUTAS DE SERVICIOS
  // ============================================================================

  // Obtener todos los servicios del negocio
  fastify.get(
    '/servicios',
    servicioController.obtenerServicios.bind(servicioController)
  );

  // Obtener un servicio por ID
  fastify.get(
    '/servicios/:id',
    servicioController.obtenerServicioPorId.bind(servicioController)
  );

  // Crear nuevo servicio
  fastify.post(
    '/servicios',
    servicioController.crearServicio.bind(servicioController)
  );

  // Actualizar datos del servicio
  fastify.put(
    '/servicios/:id',
    servicioController.actualizarServicio.bind(servicioController)
  );

  // Eliminar servicio
  fastify.delete(
    '/servicios/:id',
    servicioController.eliminarServicio.bind(servicioController)
  );

  // ============================================================================
  // RUTAS DE ASIGNACIÓN DE SUCURSALES
  // ============================================================================

  // Asignar sucursales a un servicio
  fastify.put(
    '/servicios/:id/sucursales',
    servicioController.asignarSucursales.bind(servicioController)
  );

  // Actualizar disponibilidad de un servicio en una sucursal
  fastify.patch(
    '/servicios/:id/sucursales/:sucursalId/disponibilidad',
    servicioController.actualizarDisponibilidad.bind(servicioController)
  );

  // Obtener servicios disponibles en una sucursal
  fastify.get(
    '/sucursales/:sucursalId/servicios',
    servicioController.obtenerServiciosPorSucursal.bind(servicioController)
  );
}
