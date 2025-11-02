// src/controllers/servicio.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { ServicioService } from '../services/servicio.service';
import { PrismaClient } from '@prisma/client';
import {
  ServicioDto,
  ServicioUpdateDto,
  AsignarSucursalesDto
} from '../models/servicio.model';
import limitesService from '../services/limites.service';

const prisma = new PrismaClient();

export class ServicioController {
  private servicioService: ServicioService;

  constructor() {
    this.servicioService = new ServicioService(prisma);
  }

  /**
   * GET /api/servicios
   * Listar todos los servicios del negocio
   */
  async obtenerServicios(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      const servicios = await this.servicioService.obtenerServicios(negocioId);

      return reply.status(200).send({
        success: true,
        data: servicios
      });
    } catch (error: any) {
      console.error('Error al obtener servicios:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener servicios'
      });
    }
  }

  /**
   * GET /api/servicios/:id
   * Obtener un servicio por ID
   */
  async obtenerServicioPorId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      const servicio = await this.servicioService.obtenerServicioPorId(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: servicio
      });
    } catch (error: any) {
      console.error('Error al obtener servicio:', error);

      if (error.message === 'Servicio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'No tienes permisos para acceder a este servicio') {
        return reply.status(403).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener servicio'
      });
    }
  }

  /**
   * POST /api/servicios
   * Crear nuevo servicio
   */
  async crearServicio(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as ServicioDto;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      // ✅ VALIDAR LÍMITE DE SERVICIOS ANTES DE CREAR
      await limitesService.validarLimiteServicios(negocioId);

      const servicio = await this.servicioService.crearServicio(negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: servicio,
        message: 'Servicio creado exitosamente'
      });
    } catch (error: any) {
      console.error('Error al crear servicio:', error);

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
        message: error.message || 'Error al crear servicio'
      });
    }
  }

  /**
   * PUT /api/servicios/:id
   * Actualizar datos del servicio
   */
  async actualizarServicio(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as ServicioUpdateDto;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      const servicio = await this.servicioService.actualizarServicio(id, negocioId, dto);

      return reply.status(200).send({
        success: true,
        data: servicio,
        message: 'Servicio actualizado exitosamente'
      });
    } catch (error: any) {
      console.error('Error al actualizar servicio:', error);

      if (error.message === 'Servicio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar servicio'
      });
    }
  }

  /**
   * DELETE /api/servicios/:id
   * Eliminar servicio
   */
  async eliminarServicio(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      const result = await this.servicioService.eliminarServicio(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error al eliminar servicio:', error);

      if (error.message === 'Servicio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar servicio'
      });
    }
  }

  /**
   * PUT /api/servicios/:id/sucursales
   * Asignar sucursales a un servicio
   */
  async asignarSucursales(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as AsignarSucursalesDto;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      const servicio = await this.servicioService.asignarSucursales(id, negocioId, dto);

      return reply.status(200).send({
        success: true,
        data: servicio,
        message: 'Sucursales asignadas exitosamente'
      });
    } catch (error: any) {
      console.error('Error al asignar sucursales:', error);

      if (error.message === 'Servicio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al asignar sucursales'
      });
    }
  }

  /**
   * PATCH /api/servicios/:id/sucursales/:sucursalId/disponibilidad
   * Actualizar disponibilidad de un servicio en una sucursal
   */
  async actualizarDisponibilidad(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id, sucursalId } = request.params as { id: string; sucursalId: string };
      const { disponible } = request.body as { disponible: boolean };
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      if (disponible === undefined) {
        return reply.status(400).send({
          success: false,
          message: 'El campo "disponible" es requerido'
        });
      }

      const result = await this.servicioService.actualizarDisponibilidad(
        id,
        sucursalId,
        negocioId,
        disponible
      );

      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error al actualizar disponibilidad:', error);

      if (error.message === 'Servicio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar disponibilidad'
      });
    }
  }

  /**
   * GET /api/sucursales/:sucursalId/servicios
   * Obtener servicios disponibles en una sucursal
   */
  async obtenerServiciosPorSucursal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sucursalId } = request.params as { sucursalId: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      const servicios = await this.servicioService.obtenerServiciosPorSucursal(sucursalId, negocioId);

      return reply.status(200).send({
        success: true,
        data: servicios
      });
    } catch (error: any) {
      console.error('Error al obtener servicios por sucursal:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener servicios'
      });
    }
  }

}
