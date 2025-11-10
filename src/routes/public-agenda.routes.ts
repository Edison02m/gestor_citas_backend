// src/routes/public-agenda.routes.ts

import { FastifyInstance } from 'fastify';
import { PublicAgendaService } from '../services/public-agenda.service';
import { PublicAgendaController } from '../controllers/public-agenda.controller';
import prisma from '../database/prisma';

/**
 * Rutas públicas para agenda de citas
 * NO requieren autenticación
 */
export async function publicAgendaRoutes(fastify: FastifyInstance) {
  const publicAgendaService = new PublicAgendaService(prisma);
  const publicAgendaController = new PublicAgendaController(publicAgendaService);

  // ============================================================================
  // INFORMACIÓN PÚBLICA DEL NEGOCIO
  // ============================================================================

  // Obtener información básica del negocio
  fastify.get('/:linkPublico/negocio', publicAgendaController.obtenerNegocio);

  // Obtener sucursales activas
  fastify.get('/:linkPublico/sucursales', publicAgendaController.obtenerSucursales);

  // Obtener servicios activos
  fastify.get('/:linkPublico/servicios', publicAgendaController.obtenerServicios);

  // Obtener empleados activos de una sucursal
  fastify.get('/:linkPublico/empleados/:sucursalId', publicAgendaController.obtenerEmpleados);

  // Buscar cliente por cédula
  fastify.get('/:linkPublico/cliente/:cedula', publicAgendaController.buscarClientePorCedula);

  // ============================================================================
  // DISPONIBILIDAD Y CREACIÓN DE CITAS
  // ============================================================================

  // Obtener disponibilidad de horarios
  fastify.post('/:linkPublico/disponibilidad', publicAgendaController.obtenerDisponibilidad);

  // Crear cita pública (sin autenticación)
  fastify.post('/:linkPublico/citas', publicAgendaController.crearCita);
}
