// src/repositories/whatsapp.repository.ts

import { PrismaClient } from '@prisma/client';

export class WhatsAppRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Actualizar la configuración de WhatsApp de un negocio
   */
  async updateWhatsAppConfig(
    negocioId: string,
    data: {
      whatsappInstanceId?: string;
      whatsappConnected?: boolean;
      whatsappPhoneNumber?: string;
      whatsappQrCode?: string;
      whatsappConfiguredAt?: Date;
    }
  ) {
    return this.prisma.negocio.update({
      where: { id: negocioId },
      data,
    });
  }

  /**
   * Obtener la configuración de WhatsApp de un negocio
   */
  async getWhatsAppConfig(negocioId: string) {
    return this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: {
        id: true,
        nombre: true,
        whatsappInstanceId: true,
        whatsappConnected: true,
        whatsappPhoneNumber: true,
        whatsappQrCode: true,
        whatsappConfiguredAt: true,
        notificacionesWhatsApp: true,
        limiteWhatsAppMes: true,
      },
    });
  }

  /**
   * Limpiar la configuración de WhatsApp al desvincular
   */
  async clearWhatsAppConfig(negocioId: string) {
    return this.prisma.negocio.update({
      where: { id: negocioId },
      data: {
        whatsappInstanceId: null,
        whatsappConnected: false,
        whatsappPhoneNumber: null,
        whatsappQrCode: null,
      },
    });
  }

  /**
   * Actualizar solo el estado de conexión
   */
  async updateConnectionStatus(negocioId: string, connected: boolean) {
    return this.prisma.negocio.update({
      where: { id: negocioId },
      data: {
        whatsappConnected: connected,
        ...(connected && { whatsappConfiguredAt: new Date() }),
      },
    });
  }

  /**
   * Obtener negocio por instanceId de WhatsApp
   */
  async getNegocioByInstanceId(instanceId: string) {
    return this.prisma.negocio.findFirst({
      where: { whatsappInstanceId: instanceId },
      select: {
        id: true,
        nombre: true,
        whatsappConnected: true,
      },
    });
  }

  /**
   * Actualizar el código QR temporal
   */
  async updateQRCode(negocioId: string, qrCode: string) {
    return this.prisma.negocio.update({
      where: { id: negocioId },
      data: { whatsappQrCode: qrCode },
    });
  }
}
