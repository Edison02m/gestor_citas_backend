// src/controllers/sucursal.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { SucursalService } from '../services/sucursal.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SucursalController {
  private sucursalService: SucursalService;

  constructor() {
    this.sucursalService = new SucursalService(prisma);
  }

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
}
