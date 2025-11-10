// src/controllers/whatsapp.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { WhatsAppService } from '../services/whatsapp.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WhatsAppController {
  private whatsappService: WhatsAppService;

  constructor() {
    this.whatsappService = new WhatsAppService(prisma);
  }

  /**
   * POST /api/whatsapp/vincular
   * Vincular WhatsApp para el negocio (crear instancia y obtener QR)
   */
  async vincularWhatsApp(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      
      // Obtener negocioId del usuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: user.userId },
        include: { negocio: true },
      });

      if (!usuario || !usuario.negocio) {
        return reply.status(404).send({
          success: false,
          message: 'No se encontró un negocio asociado a este usuario',
        });
      }

      const resultado = await this.whatsappService.vincularWhatsApp(usuario.negocio.id);

      return reply.status(200).send({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Error al vincular WhatsApp:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al vincular WhatsApp',
      });
    }
  }

  /**
   * GET /api/whatsapp/estado
   * Obtener el estado de conexión de WhatsApp
   */
  async obtenerEstado(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;

      // Obtener negocioId del usuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: user.userId },
        include: { negocio: true },
      });

      if (!usuario || !usuario.negocio) {
        return reply.status(404).send({
          success: false,
          message: 'No se encontró un negocio asociado a este usuario',
        });
      }

      const estado = await this.whatsappService.obtenerEstado(usuario.negocio.id);

      return reply.status(200).send({
        success: true,
        data: estado,
      });
    } catch (error: any) {
      console.error('Error al obtener estado:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al obtener estado de WhatsApp',
      });
    }
  }

  /**
   * GET /api/whatsapp/qr
   * Obtener un nuevo código QR (si el anterior expiró)
   */
  async obtenerNuevoQR(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;

      // Obtener negocioId del usuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: user.userId },
        include: { negocio: true },
      });

      if (!usuario || !usuario.negocio) {
        return reply.status(404).send({
          success: false,
          message: 'No se encontró un negocio asociado a este usuario',
        });
      }

      const resultado = await this.whatsappService.obtenerNuevoQR(usuario.negocio.id);

      return reply.status(200).send({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Error al obtener QR:', error);

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener código QR',
      });
    }
  }

  /**
   * POST /api/whatsapp/desvincular
   * Desvincular WhatsApp del negocio
   */
  async desvincularWhatsApp(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;

      // Obtener negocioId del usuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: user.userId },
        include: { negocio: true },
      });

      if (!usuario || !usuario.negocio) {
        return reply.status(404).send({
          success: false,
          message: 'No se encontró un negocio asociado a este usuario',
        });
      }

      const resultado = await this.whatsappService.desvincularWhatsApp(usuario.negocio.id);

      return reply.status(200).send({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Error al desvincular WhatsApp:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al desvincular WhatsApp',
      });
    }
  }

  /**
   * POST /api/whatsapp/webhook
   * Recibir eventos de Evolution API (NO requiere autenticación, pero valida API Key)
   */
  async webhookEvolution(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validar API Key en headers
      const apiKey = request.headers['apikey'] as string;
      const expectedApiKey = process.env.EVOLUTION_API_KEY;

      if (!apiKey || apiKey !== expectedApiKey) {
        console.warn('⚠️ Webhook con API Key inválida');
        return reply.status(401).send({
          success: false,
          message: 'API Key inválida',
        });
      }

      const data = request.body;
      console.log('📥 Webhook recibido:', JSON.stringify(data, null, 2));

      // Procesar webhook
      await this.whatsappService.procesarWebhook(data);

      return reply.status(200).send({
        success: true,
        message: 'Webhook procesado',
      });
    } catch (error: any) {
      console.error('Error al procesar webhook:', error);

      // Devolver 200 de todas formas para que Evolution no reintente
      return reply.status(200).send({
        success: false,
        message: 'Error al procesar webhook (ya registrado)',
      });
    }
  }

  /**
   * POST /api/whatsapp/check-number
   * Verificar si un número tiene WhatsApp
   */
  async verificarNumero(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = (request as any).user;
      const { phoneNumber } = request.body as { phoneNumber: string };

      if (!phoneNumber) {
        return reply.status(400).send({
          success: false,
          message: 'El número de teléfono es requerido',
        });
      }

      // Obtener negocioId del usuario
      const usuario = await prisma.usuario.findUnique({
        where: { id: user.userId },
        include: { negocio: true },
      });

      if (!usuario || !usuario.negocio) {
        return reply.status(404).send({
          success: false,
          message: 'No se encontró un negocio asociado a este usuario',
        });
      }

      if (!usuario.negocio.whatsappInstanceId || !usuario.negocio.whatsappConnected) {
        return reply.status(400).send({
          success: false,
          message: 'WhatsApp no está conectado. Vincúlalo primero',
        });
      }

      // Verificar número con Evolution API
      const { evolutionApiService } = await import('../services/evolution-api.service');
      const resultado = await evolutionApiService.checkWhatsAppNumber(
        usuario.negocio.whatsappInstanceId,
        phoneNumber
      );

      return reply.status(200).send({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      console.error('Error al verificar número:', error);

      return reply.status(500).send({
        success: false,
        message: error.message || 'Error al verificar número de WhatsApp',
      });
    }
  }
}

// Crear instancia del controlador
const whatsappController = new WhatsAppController();

// Exportar funciones para las rutas
export const vincularWhatsApp = whatsappController.vincularWhatsApp.bind(whatsappController);
export const obtenerEstado = whatsappController.obtenerEstado.bind(whatsappController);
export const obtenerNuevoQR = whatsappController.obtenerNuevoQR.bind(whatsappController);
export const desvincularWhatsApp = whatsappController.desvincularWhatsApp.bind(whatsappController);
export const webhookEvolution = whatsappController.webhookEvolution.bind(whatsappController);
export const verificarNumero = whatsappController.verificarNumero.bind(whatsappController);
