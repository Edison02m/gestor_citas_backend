// src/routes/empleado.routes.ts

import { FastifyInstance } from 'fastify';
import { EmpleadoService } from '../services/empleado.service';
import { EmpleadoController } from '../controllers/empleado.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../database/prisma';

export async function empleadoRoutes(fastify: FastifyInstance) {
  const empleadoService = new EmpleadoService(prisma);
  const empleadoController = new EmpleadoController(empleadoService);

  // Todas las rutas requieren autenticación
  fastify.addHook('preHandler', authMiddleware);

  // ============================================================================
  // CRUD DE EMPLEADOS
  // ============================================================================

  // Listar todos los empleados del negocio
  fastify.get('/', empleadoController.listar);

  // Obtener un empleado por ID
  fastify.get('/:id', empleadoController.obtenerPorId);

  // Crear un nuevo empleado
  fastify.post('/', empleadoController.crear);

  // Actualizar un empleado
  fastify.put('/:id', empleadoController.actualizar);

  // Eliminar un empleado
  fastify.delete('/:id', empleadoController.eliminar);

  // ============================================================================
  // HORARIOS DE EMPLEADOS
  // ============================================================================

  // Obtener horarios de un empleado
  fastify.get('/:id/horarios', empleadoController.obtenerHorarios);

  // Actualizar horarios de un empleado (reemplaza todos los horarios)
  fastify.put('/:id/horarios', empleadoController.actualizarHorarios);

  // ============================================================================
  // BLOQUEOS DE EMPLEADOS
  // ============================================================================

  // Obtener bloqueos de un empleado
  fastify.get('/:id/bloqueos', empleadoController.obtenerBloqueos);

  // Crear un bloqueo para un empleado
  fastify.post('/:id/bloqueos', empleadoController.crearBloqueo);

  // Eliminar un bloqueo
  fastify.delete('/:id/bloqueos/:bloqueoId', empleadoController.eliminarBloqueo);

  // ============================================================================
  // SUCURSALES DE EMPLEADOS
  // ============================================================================

  // Obtener sucursales asignadas a un empleado
  fastify.get('/:id/sucursales', empleadoController.obtenerSucursales);

  // Asignar empleado a una o más sucursales
  fastify.post('/:id/sucursales', empleadoController.asignarSucursales);

  // Desasignar empleado de una sucursal
  fastify.delete('/:id/sucursales/:sucursalId', empleadoController.desasignarSucursal);
}
