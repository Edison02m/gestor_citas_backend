// src/services/envios.service.ts

import prisma from '../database/prisma';
import { TipoEnvio } from '@prisma/client';

/**
 * Servicio para gestionar y limitar envíos de Email y WhatsApp
 * Valida límites mensuales y registra cada envío
 */
class EnviosService {
  /**
   * Registra un envío de email o WhatsApp
   */
  async registrarEnvio(
    negocioId: string,
    tipo: TipoEnvio,
    destinatario: string,
    opciones?: {
      asunto?: string;
      exitoso?: boolean;
      error?: string;
      citaId?: string;
    }
  ): Promise<void> {
    await prisma.registroEnvio.create({
      data: {
        negocioId,
        tipo,
        destinatario,
        asunto: opciones?.asunto,
        exitoso: opciones?.exitoso ?? true,
        error: opciones?.error,
        citaId: opciones?.citaId,
      },
    });
  }

  /**
   * Obtiene el conteo de envíos del mes actual por tipo
   */
  async contarEnviosMesActual(
    negocioId: string,
    tipo: TipoEnvio
  ): Promise<number> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const finMes = new Date();
    finMes.setMonth(finMes.getMonth() + 1);
    finMes.setDate(0);
    finMes.setHours(23, 59, 59, 999);

    const count = await prisma.registroEnvio.count({
      where: {
        negocioId,
        tipo,
        exitoso: true, // Solo contar envíos exitosos
        createdAt: {
          gte: inicioMes,
          lte: finMes,
        },
      },
    });

    return count;
  }

  /**
   * Verifica si el negocio puede enviar un email (no excede el límite)
   */
  async puedeEnviarEmail(negocioId: string): Promise<{
    permitido: boolean;
    usado: number;
    limite: number | null;
    mensaje?: string;
  }> {
    // Obtener límite del negocio
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { limiteEmailMes: true },
    });

    if (!negocio) {
      return {
        permitido: false,
        usado: 0,
        limite: null,
        mensaje: 'Negocio no encontrado',
      };
    }

    const limite = negocio.limiteEmailMes;

    // Si es ilimitado (null), siempre puede enviar
    if (limite === null) {
      const usado = await this.contarEnviosMesActual(negocioId, TipoEnvio.EMAIL);
      return {
        permitido: true,
        usado,
        limite: null,
      };
    }

    // Contar envíos del mes
    const usado = await this.contarEnviosMesActual(negocioId, TipoEnvio.EMAIL);

    if (usado >= limite) {
      return {
        permitido: false,
        usado,
        limite,
        mensaje: `Has alcanzado el límite de ${limite} emails por mes. Actualiza tu plan para enviar más.`,
      };
    }

    return {
      permitido: true,
      usado,
      limite,
    };
  }

  /**
   * Verifica si el negocio puede enviar un WhatsApp (no excede el límite)
   */
  async puedeEnviarWhatsApp(negocioId: string): Promise<{
    permitido: boolean;
    usado: number;
    limite: number | null;
    mensaje?: string;
  }> {
    // Obtener límite del negocio
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { limiteWhatsAppMes: true },
    });

    if (!negocio) {
      return {
        permitido: false,
        usado: 0,
        limite: null,
        mensaje: 'Negocio no encontrado',
      };
    }

    const limite = negocio.limiteWhatsAppMes;

    // Si el límite es null (plan GRATIS o PRO PLUS ilimitado)
    if (limite === null) {
      // En plan GRATIS, null significa "no disponible"
      const negocioCompleto = await prisma.negocio.findUnique({
        where: { id: negocioId },
        select: {
          suscripcion: {
            select: {
              codigoSuscripcion: {
                select: { plan: true },
              },
            },
          },
        },
      });

      const plan = negocioCompleto?.suscripcion?.codigoSuscripcion?.plan;

      // Si es GRATIS, no tiene WhatsApp
      if (plan === 'GRATIS') {
        return {
          permitido: false,
          usado: 0,
          limite: null,
          mensaje: 'WhatsApp no disponible en plan GRATIS. Actualiza tu plan.',
        };
      }

      // Si es PRO PLUS, es ilimitado
      const usado = await this.contarEnviosMesActual(negocioId, TipoEnvio.WHATSAPP);
      return {
        permitido: true,
        usado,
        limite: null,
      };
    }

    // Contar envíos del mes
    const usado = await this.contarEnviosMesActual(negocioId, TipoEnvio.WHATSAPP);

    if (usado >= limite) {
      return {
        permitido: false,
        usado,
        limite,
        mensaje: `Has alcanzado el límite de ${limite} mensajes WhatsApp por mes. Actualiza tu plan para enviar más.`,
      };
    }

    return {
      permitido: true,
      usado,
      limite,
    };
  }

  /**
   * Obtiene estadísticas de envíos del mes actual
   */
  async obtenerEstadisticasMes(negocioId: string): Promise<{
    emails: {
      usado: number;
      limite: number | null;
      porcentaje: number;
    };
    whatsapp: {
      usado: number;
      limite: number | null;
      porcentaje: number;
    };
  }> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: {
        limiteEmailMes: true,
        limiteWhatsAppMes: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    const usadoEmails = await this.contarEnviosMesActual(negocioId, TipoEnvio.EMAIL);
    const usadoWhatsApp = await this.contarEnviosMesActual(negocioId, TipoEnvio.WHATSAPP);

    const calcularPorcentaje = (usado: number, limite: number | null): number => {
      if (limite === null) return 0;
      return Math.round((usado / limite) * 100);
    };

    return {
      emails: {
        usado: usadoEmails,
        limite: negocio.limiteEmailMes,
        porcentaje: calcularPorcentaje(usadoEmails, negocio.limiteEmailMes),
      },
      whatsapp: {
        usado: usadoWhatsApp,
        limite: negocio.limiteWhatsAppMes,
        porcentaje: calcularPorcentaje(usadoWhatsApp, negocio.limiteWhatsAppMes),
      },
    };
  }
}

export default new EnviosService();
