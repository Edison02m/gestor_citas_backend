// src/controllers/negocio.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { NegocioService } from '../services/negocio.service';
import { NegocioRepository } from '../repositories/negocio.repository';
import { PrismaClient } from '@prisma/client';
import {
  UpdateNegocioDto,
  UpdateAgendaPublicaDto,
  UpdateNotificacionesDto,
  UpdateMensajesWhatsAppDto,
} from '../models/negocio.model';

const prisma = new PrismaClient();

export class NegocioController {
  private negocioService: NegocioService;

  constructor() {
    const negocioRepository = new NegocioRepository(prisma);
    this.negocioService = new NegocioService(negocioRepository);
  }

  /**
   * GET /api/negocio
   * Obtener información completa del negocio
   */
  async obtenerNegocio(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const usuarioId = user.userId;

      const negocio = await this.negocioService.obtenerNegocio(usuarioId);

      return reply.status(200).send({
        success: true,
        data: negocio,
      });
    } catch (error: any) {
      console.error('Error al obtener negocio:', error);

      if (error.message === 'Negocio no encontrado') {
        return reply.status(404).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener negocio',
      });
    }
  }

  /**
   * PUT /api/negocio
   * Actualizar información básica del negocio
   */
  async actualizarNegocio(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const usuarioId = user.userId;
      const dto = request.body as UpdateNegocioDto;

      const negocio = await this.negocioService.actualizarNegocio(usuarioId, dto);

      return reply.status(200).send({
        success: true,
        data: negocio,
        message: 'Negocio actualizado correctamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar negocio:', error);

      if (
        error.message.includes('debe tener al menos') ||
        error.message.includes('no encontrado')
      ) {
        return reply.status(400).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al actualizar negocio',
      });
    }
  }

  /**
   * PUT /api/negocio/agenda-publica
   * Actualizar configuración de agenda pública
   */
  async actualizarAgendaPublica(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const usuarioId = user.userId;
      const dto = request.body as UpdateAgendaPublicaDto;

      const negocio = await this.negocioService.actualizarAgendaPublica(usuarioId, dto);

      return reply.status(200).send({
        success: true,
        data: negocio,
        message: 'Agenda pública actualizada correctamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar agenda pública:', error);

      if (
        error.message.includes('solo puede contener') ||
        error.message.includes('debe tener al menos') ||
        error.message.includes('ya está en uso') ||
        error.message.includes('no encontrado')
      ) {
        return reply.status(400).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al actualizar agenda pública',
      });
    }
  }

  /**
   * PUT /api/negocio/notificaciones
   * Actualizar configuración de notificaciones y recordatorios
   */
  async actualizarNotificaciones(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const usuarioId = user.userId;
      const dto = request.body as UpdateNotificacionesDto;

      const negocio = await this.negocioService.actualizarNotificaciones(usuarioId, dto);

      return reply.status(200).send({
        success: true,
        data: negocio,
        message: 'Notificaciones y recordatorios actualizados correctamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar notificaciones:', error);

      if (
        error.message.includes('no encontrado') ||
        error.message.includes('debe estar entre')
      ) {
        return reply.status(400).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al actualizar notificaciones',
      });
    }
  }

  /**
   * PUT /api/negocio/mensajes-whatsapp
   * Actualizar mensajes personalizables de WhatsApp
   */
  async actualizarMensajesWhatsApp(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const usuarioId = user.userId;
      const dto = request.body as UpdateMensajesWhatsAppDto;

      const negocio = await this.negocioService.actualizarMensajesWhatsApp(usuarioId, dto);

      return reply.status(200).send({
        success: true,
        data: negocio,
        message: 'Mensajes de WhatsApp actualizados correctamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar mensajes de WhatsApp:', error);

      if (
        error.message.includes('no encontrado') ||
        error.message.includes('debe incluir')
      ) {
        return reply.status(400).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al actualizar mensajes de WhatsApp',
      });
    }
  }

  /**
   * POST /api/negocio/generar-link
   * Generar link público automáticamente
   */
  async generarLinkPublico(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const usuarioId = user.userId;

      const resultado = await this.negocioService.generarLinkPublico(usuarioId);

      return reply.status(200).send({
        success: true,
        data: resultado,
        message: 'Link público generado correctamente',
      });
    } catch (error: any) {
      console.error('Error al generar link público:', error);

      if (error.message.includes('no encontrado')) {
        return reply.status(404).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al generar link público',
      });
    }
  }

  /**
   * PATCH /api/negocio/logo
   * Actualizar logo del negocio
   * 
   * Body esperado:
   * {
   *   logoUrl: string  // URL de ImageKit
   * }
   */
  async actualizarLogo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const usuarioId = user.userId;
      const { logoUrl } = request.body as { logoUrl: string };

      // logoUrl puede ser string vacío para eliminar el logo, o URL válida
      if (logoUrl === undefined || logoUrl === null) {
        return reply.status(400).send({
          success: false,
          message: 'logoUrl es requerido (puede ser string vacío para eliminar)',
        });
      }

      // Si logoUrl no está vacío, validar que sea URL válida
      if (logoUrl !== '' && !logoUrl.startsWith('http://') && !logoUrl.startsWith('https://')) {
        return reply.status(400).send({
          success: false,
          message: 'logoUrl debe ser una URL válida o string vacío',
        });
      }

      const negocio = await this.negocioService.actualizarLogo(usuarioId, logoUrl);

      return reply.status(200).send({
        success: true,
        data: negocio,
        message: logoUrl ? 'Logo actualizado correctamente' : 'Logo eliminado correctamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar logo:', error);

      if (error.message.includes('no encontrado')) {
        return reply.status(404).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al actualizar logo',
      });
    }
  }
}
