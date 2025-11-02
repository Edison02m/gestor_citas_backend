// src/controllers/cita.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { CitaService } from '../services/cita.service';
import {
  CreateCitaDto,
  UpdateCitaDto,
  FiltrosCitasDto,
  DisponibilidadEmpleadoDto,
} from '../models/cita.model';
import { EstadoCita } from '@prisma/client';
import limitesService from '../services/limites.service';
import usoRecursosService from '../services/uso-recursos.service';

export class CitaController {
  constructor(private service: CitaService) {}

  /**
   * POST /api/citas
   * Crear una nueva cita
   */
  crearCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as CreateCitaDto;

      // ✅ VALIDAR LÍMITE DE CITAS MENSUALES ANTES DE CREAR
      await limitesService.validarLimiteCitasMes(negocioId);

      const cita = await this.service.crearCita(negocioId, dto, user.userId);

      // ✅ INCREMENTAR CONTADOR DE CITAS DEL MES
      await usoRecursosService.incrementarCitas(negocioId);

      return reply.status(201).send({
        success: true,
        data: cita,
        message: 'Cita creada exitosamente',
      });
    } catch (error: any) {
      // Si es error de límite alcanzado, retornar 402 (Payment Required)
      if (error.message.includes('límite')) {
        return reply.status(402).send({
          success: false,
          message: error.message,
          code: 'LIMIT_REACHED'
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear cita',
      });
    }
  };

  /**
   * GET /api/citas/:id
   * Obtener una cita por ID
   */
  obtenerCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const cita = await this.service.obtenerCita(id, user.negocioId);

      return reply.status(200).send({
        success: true,
        data: cita,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Cita no encontrada',
      });
    }
  };

  /**
   * GET /api/citas
   * Listar citas con filtros
   */
  listarCitas = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const queryParams = request.query as any;

      // Parsear parámetros de query (vienen como strings)
      const filtros: FiltrosCitasDto = {
        fechaInicio: queryParams.fechaInicio,
        fechaFin: queryParams.fechaFin,
        clienteId: queryParams.clienteId,
        empleadoId: queryParams.empleadoId,
        sucursalId: queryParams.sucursalId,
        servicioId: queryParams.servicioId,
        estado: queryParams.estado,
        canalOrigen: queryParams.canalOrigen,
        page: queryParams.page ? parseInt(queryParams.page, 10) : 1,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : 50,
      };

      const resultado = await this.service.listarCitas(user.negocioId, filtros);

      return reply.status(200).send({
        success: true,
        data: resultado.citas,
        pagination: {
          page: resultado.page,
          limit: resultado.limit,
          total: resultado.total,
          totalPages: resultado.totalPages,
        },
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al listar citas',
      });
    }
  };

  /**
   * GET /api/citas/fecha/:fecha
   * Obtener citas de un día específico
   */
  obtenerCitasPorFecha = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { fecha } = request.params as { fecha: string };
      const { sucursalId } = request.query as { sucursalId?: string };

      const citas = await this.service.obtenerCitasPorFecha(
        user.negocioId,
        fecha,
        sucursalId
      );

      return reply.status(200).send({
        success: true,
        data: citas,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener citas',
      });
    }
  };

  /**
   * PUT /api/citas/:id
   * Actualizar una cita
   */
  actualizarCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const dto = request.body as UpdateCitaDto;

      console.log('📝 BACKEND - Actualizar cita recibido:');
      console.log('ID:', id);
      console.log('User:', { userId: user.userId, negocioId: user.negocioId });
      console.log('DTO recibido:', JSON.stringify(dto, null, 2));
      console.log('Tipo de datos:', {
        fecha: typeof dto.fecha,
        horaInicio: typeof dto.horaInicio,
        horaFin: typeof dto.horaFin,
        servicioId: typeof dto.servicioId,
        empleadoId: typeof dto.empleadoId,
        sucursalId: typeof dto.sucursalId,
      });

      const cita = await this.service.actualizarCita(
        id,
        user.negocioId,
        dto,
        user.userId
      );

      console.log('✅ BACKEND - Cita actualizada exitosamente');

      return reply.status(200).send({
        success: true,
        data: cita,
        message: 'Cita actualizada exitosamente',
      });
    } catch (error: any) {
      console.error('❌ BACKEND - Error al actualizar cita:');
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar cita',
      });
    }
  };

  /**
   * PATCH /api/citas/:id/estado
   * Cambiar estado de una cita
   */
  cambiarEstado = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };
      const { estado } = request.body as { estado: EstadoCita };

      const cita = await this.service.cambiarEstado(
        id,
        user.negocioId,
        estado,
        user.userId
      );

      return reply.status(200).send({
        success: true,
        data: cita,
        message: 'Estado actualizado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al cambiar estado',
      });
    }
  };

  /**
   * PATCH /api/citas/:id/cancelar
   * Cancelar una cita
   */
  cancelarCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const cita = await this.service.cancelarCita(id, user.negocioId, user.userId);

      return reply.status(200).send({
        success: true,
        data: cita,
        message: 'Cita cancelada exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al cancelar cita',
      });
    }
  };

  /**
   * PATCH /api/citas/:id/confirmar
   * Confirmar una cita
   */
  confirmarCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const cita = await this.service.confirmarCita(id, user.negocioId, user.userId);

      return reply.status(200).send({
        success: true,
        data: cita,
        message: 'Cita confirmada exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al confirmar cita',
      });
    }
  };

  /**
   * PATCH /api/citas/:id/completar
   * Completar una cita
   */
  completarCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const cita = await this.service.completarCita(id, user.negocioId, user.userId);

      return reply.status(200).send({
        success: true,
        data: cita,
        message: 'Cita completada exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al completar cita',
      });
    }
  };

  /**
   * PATCH /api/citas/:id/no-asistio
   * Marcar como no asistió
   */
  marcarNoAsistio = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      const cita = await this.service.marcarNoAsistio(id, user.negocioId, user.userId);

      return reply.status(200).send({
        success: true,
        data: cita,
        message: 'Cita marcada como no asistió',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al marcar no asistió',
      });
    }
  };

  /**
   * DELETE /api/citas/:id
   * Eliminar una cita
   */
  eliminarCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { id } = request.params as { id: string };

      await this.service.eliminarCita(id, user.negocioId);

      return reply.status(200).send({
        success: true,
        message: 'Cita eliminada exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar cita',
      });
    }
  };

  /**
   * POST /api/citas/disponibilidad
   * Obtener horarios disponibles
   */
  obtenerDisponibilidad = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const dto = request.body as DisponibilidadEmpleadoDto;

      const horarios = await this.service.obtenerDisponibilidad(user.negocioId, dto);

      return reply.status(200).send({
        success: true,
        data: horarios,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener disponibilidad',
      });
    }
  };

  /**
   * GET /api/citas/estadisticas
   * Obtener estadísticas de citas
   */
  obtenerEstadisticas = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { fechaInicio, fechaFin } = request.query as {
        fechaInicio?: string;
        fechaFin?: string;
      };

      const estadisticas = await this.service.obtenerEstadisticas(
        user.negocioId,
        fechaInicio,
        fechaFin
      );

      return reply.status(200).send({
        success: true,
        data: estadisticas,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener estadísticas',
      });
    }
  };

  /**
   * GET /api/citas/cliente/:clienteId/proximas
   * Obtener próximas citas de un cliente
   */
  obtenerProximasCitasCliente = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { clienteId } = request.params as { clienteId: string };

      const citas = await this.service.obtenerProximasCitasCliente(
        clienteId,
        user.negocioId
      );

      return reply.status(200).send({
        success: true,
        data: citas,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener citas',
      });
    }
  };

  /**
   * GET /api/citas/cliente/:clienteId/historial
   * Obtener historial de citas de un cliente
   */
  obtenerHistorialCliente = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { clienteId } = request.params as { clienteId: string };

      const citas = await this.service.obtenerHistorialCliente(clienteId, user.negocioId);

      return reply.status(200).send({
        success: true,
        data: citas,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener historial',
      });
    }
  };
}
