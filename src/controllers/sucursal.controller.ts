// src/controllers/sucursal.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { SucursalService } from '../services/sucursal.service';
import { PrismaClient } from '@prisma/client';
import { SucursalDto, SucursalUpdateDto, HorarioSucursalDto } from '../models/sucursal.model';

const prisma = new PrismaClient();

export class SucursalController {
  private sucursalService: SucursalService;

  constructor() {
    this.sucursalService = new SucursalService(prisma);
  }

  /**
   * GET /api/sucursales
   * Listar todas las sucursales del negocio
   */
  async obtenerSucursales(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      if (!negocioId) {
        return reply.status(400).send({
          success: false,
          message: 'No se encontró el negocio asociado al usuario'
        });
      }

      const sucursales = await this.sucursalService.obtenerSucursales(negocioId);

      return reply.status(200).send({
        success: true,
        data: sucursales
      });
    } catch (error: any) {
      console.error('Error al obtener sucursales:', error);
      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener sucursales'
      });
    }
  }

  /**
   * GET /api/sucursales/:id
   * Obtener una sucursal por ID
   */
  async obtenerSucursalPorId(request: FastifyRequest, reply: FastifyReply) {
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

      const sucursal = await this.sucursalService.obtenerSucursalPorId(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: sucursal
      });
    } catch (error: any) {
      console.error('Error al obtener sucursal:', error);
      
      if (error.message === 'Sucursal no encontrada') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'No tienes permisos para acceder a esta sucursal') {
        return reply.status(403).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener sucursal'
      });
    }
  }

  /**
   * POST /api/sucursales
   * Crear nueva sucursal con horarios
   */
  async crearSucursal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as SucursalDto;

      const sucursal = await this.sucursalService.crearSucursal(negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: sucursal,
        message: 'Sucursal creada exitosamente'
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear sucursal'
      });
    }
  }

  /**
   * PUT /api/sucursales/:id
   * Actualizar datos generales de la sucursal
   */
  async actualizarSucursal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as SucursalUpdateDto;

      const sucursal = await this.sucursalService.actualizarSucursal(id, negocioId, dto);

      return reply.status(200).send({
        success: true,
        data: sucursal,
        message: 'Sucursal actualizada exitosamente'
      });
    } catch (error: any) {
      if (error.message === 'Sucursal no encontrada') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar sucursal'
      });
    }
  }

  /**
   * PUT /api/sucursales/:id/horarios
   * Actualizar horarios de la sucursal
   */
  async actualizarHorarios(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { horarios } = request.body as { horarios: HorarioSucursalDto[] };

      const sucursal = await this.sucursalService.actualizarHorarios(id, negocioId, horarios);

      return reply.status(200).send({
        success: true,
        data: sucursal,
        message: 'Horarios actualizados exitosamente'
      });
    } catch (error: any) {
      if (error.message === 'Sucursal no encontrada') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar horarios'
      });
    }
  }

  /**
   * DELETE /api/sucursales/:id
   * Eliminar sucursal
   */
  async eliminarSucursal(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const user = (request as any).user;
      const negocioId = user.negocioId;

      const result = await this.sucursalService.eliminarSucursal(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.message === 'Sucursal no encontrada') {
        return reply.status(404).send({
          success: false,
          message: error.message
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar sucursal'
      });
    }
  }
}
