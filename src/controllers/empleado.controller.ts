// src/controllers/empleado.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { EmpleadoService } from '../services/empleado.service';
import {
  EmpleadoDto,
  EmpleadoUpdateDto,
  HorarioEmpleadoDto,
  BloqueoEmpleadoDto,
} from '../models/empleado.model';
import limitesService from '../services/limites.service';

interface QueryParams {
  pagina?: string;
  limite?: string;
  fechaDesde?: string;
}

export class EmpleadoController {
  constructor(private service: EmpleadoService) {}

  /**
   * GET /api/empleados
   * Listar todos los empleados del negocio
   */
  listar = async (
    request: FastifyRequest<{ Querystring: QueryParams }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      const pagina = parseInt(request.query.pagina || '1', 10);
      const limite = parseInt(request.query.limite || '50', 10);

      const result = await this.service.listarEmpleados(
        negocioId,
        pagina,
        limite
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al listar empleados',
      });
    }
  };

  /**
   * GET /api/empleados/:id
   * Obtener un empleado por ID
   */
  obtenerPorId = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;

      const empleado = await this.service.obtenerEmpleado(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: empleado,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Empleado no encontrado',
      });
    }
  };

  /**
   * POST /api/empleados
   * Crear un nuevo empleado
   */
  crear = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as EmpleadoDto;

      // ✅ VALIDAR LÍMITE DE EMPLEADOS ANTES DE CREAR
      await limitesService.validarLimiteEmpleados(negocioId);

      const empleado = await this.service.crearEmpleado(negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: empleado,
        message: 'Empleado creado exitosamente',
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
        message: error.message || 'Error al crear empleado',
      });
    }
  };

  /**
   * PUT /api/empleados/:id
   * Actualizar un empleado
   */
  actualizar = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;
      const dto = request.body as EmpleadoUpdateDto;

      const empleado = await this.service.actualizarEmpleado(
        id,
        negocioId,
        dto
      );

      return reply.status(200).send({
        success: true,
        data: empleado,
        message: 'Empleado actualizado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar empleado',
      });
    }
  };

  /**
   * DELETE /api/empleados/:id
   * Eliminar un empleado
   */
  eliminar = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;

      const result = await this.service.eliminarEmpleado(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Empleado eliminado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar empleado',
      });
    }
  };

  // ============================================================================
  // HORARIOS
  // ============================================================================

  /**
   * GET /api/empleados/:id/horarios
   * Obtener horarios de un empleado
   */
  obtenerHorarios = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;

      const horarios = await this.service.obtenerHorarios(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: horarios,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener horarios',
      });
    }
  };

  /**
   * PUT /api/empleados/:id/horarios
   * Actualizar horarios de un empleado (reemplaza todos)
   */
  actualizarHorarios = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;
      const horarios = request.body as HorarioEmpleadoDto[];

      const result = await this.service.actualizarHorarios(
        id,
        negocioId,
        horarios
      );

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Horarios actualizados exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar horarios',
      });
    }
  };

  // ============================================================================
  // BLOQUEOS
  // ============================================================================

  /**
   * GET /api/empleados/:id/bloqueos
   * Obtener bloqueos de un empleado
   */
  obtenerBloqueos = async (
    request: FastifyRequest<{ Params: { id: string }; Querystring: QueryParams }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;

      const fechaDesde = request.query.fechaDesde
        ? new Date(request.query.fechaDesde)
        : undefined;

      const bloqueos = await this.service.obtenerBloqueos(
        id,
        negocioId,
        fechaDesde
      );

      return reply.status(200).send({
        success: true,
        data: bloqueos,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener bloqueos',
      });
    }
  };

  /**
   * POST /api/empleados/:id/bloqueos
   * Crear un bloqueo para un empleado
   */
  crearBloqueo = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;
      const dto = request.body as BloqueoEmpleadoDto;

      // Convertir fechas string a Date si es necesario
      if (typeof dto.fechaInicio === 'string') {
        dto.fechaInicio = new Date(dto.fechaInicio);
      }
      if (typeof dto.fechaFin === 'string') {
        dto.fechaFin = new Date(dto.fechaFin);
      }

      const bloqueo = await this.service.crearBloqueo(id, negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: bloqueo,
        message: 'Bloqueo creado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear bloqueo',
      });
    }
  };

  /**
   * DELETE /api/empleados/:id/bloqueos/:bloqueoId
   * Eliminar un bloqueo
   */
  eliminarBloqueo = async (
    request: FastifyRequest<{ Params: { id: string; bloqueoId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id, bloqueoId } = request.params;

      const result = await this.service.eliminarBloqueo(
        bloqueoId,
        id,
        negocioId
      );

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Bloqueo eliminado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar bloqueo',
      });
    }
  };

  // ============================================================================
  // SUCURSALES
  // ============================================================================

  /**
   * GET /api/empleados/:id/sucursales
   * Obtener sucursales asignadas a un empleado
   */
  obtenerSucursales = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;

      const sucursales = await this.service.obtenerSucursales(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: sucursales,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener sucursales',
      });
    }
  };

  /**
   * POST /api/empleados/:id/sucursales
   * Asignar empleado a una o más sucursales
   */
  asignarSucursales = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;
      const { sucursalIds } = request.body as { sucursalIds: string[] };

      const result = await this.service.asignarSucursales(
        id,
        negocioId,
        sucursalIds
      );

      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Empleado asignado a sucursales exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al asignar sucursales',
      });
    }
  };

  /**
   * DELETE /api/empleados/:id/sucursales/:sucursalId
   * Desasignar empleado de una sucursal
   */
  desasignarSucursal = async (
    request: FastifyRequest<{ Params: { id: string; sucursalId: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id, sucursalId } = request.params;

      const result = await this.service.desasignarSucursal(
        id,
        sucursalId,
        negocioId
      );

      return reply.status(200).send({
        success: true,
        data: result,
        message: 'Empleado desasignado de la sucursal exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al desasignar sucursal',
      });
    }
  };
}
