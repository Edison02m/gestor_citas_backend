// src/routes/cita.routes.ts

import { FastifyInstance } from 'fastify';
import { CitaService } from '../services/cita.service';
import { CitaController } from '../controllers/cita.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { verificarSuscripcionMiddleware } from '../middlewares/verificar-suscripcion.middleware';
import prisma from '../database/prisma';

export async function citaRoutes(fastify: FastifyInstance) {
  const citaService = new CitaService(prisma);
  const citaController = new CitaController(citaService);

  // Todas las rutas requieren autenticación y suscripción activa
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', verificarSuscripcionMiddleware);

  // ============================================================================
  // CRUD de Citas
  // ============================================================================

  // Crear nueva cita
  fastify.post('/', citaController.crearCita);

  // Listar citas con filtros
  fastify.get('/', citaController.listarCitas);

  // Obtener cita por ID
  fastify.get('/:id', citaController.obtenerCita);

  // Actualizar cita
  fastify.put('/:id', citaController.actualizarCita);

  // Eliminar cita
  fastify.delete('/:id', citaController.eliminarCita);

  // ============================================================================
  // Cambios de Estado
  // ============================================================================

  // Cambiar estado genérico
  fastify.patch('/:id/estado', citaController.cambiarEstado);

  // Confirmar cita
  fastify.patch('/:id/confirmar', citaController.confirmarCita);

  // Completar cita
  fastify.patch('/:id/completar', citaController.completarCita);

  // Cancelar cita
  fastify.patch('/:id/cancelar', citaController.cancelarCita);

  // Marcar como no asistió
  fastify.patch('/:id/no-asistio', citaController.marcarNoAsistio);

  // ============================================================================
  // Consultas Especiales
  // ============================================================================

  // Obtener citas por fecha
  fastify.get('/fecha/:fecha', citaController.obtenerCitasPorFecha);

  // Obtener disponibilidad de horarios
  fastify.post('/disponibilidad', citaController.obtenerDisponibilidad);

  // Obtener estadísticas
  fastify.get('/estadisticas/general', citaController.obtenerEstadisticas);

  // Próximas citas de un cliente
  fastify.get('/cliente/:clienteId/proximas', citaController.obtenerProximasCitasCliente);

  // Historial de citas de un cliente
  fastify.get('/cliente/:clienteId/historial', citaController.obtenerHistorialCliente);
}
