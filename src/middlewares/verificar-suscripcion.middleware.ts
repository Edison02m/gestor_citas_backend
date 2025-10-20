// src/middlewares/verificar-suscripcion.middleware.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { SuscripcionVerificationService } from '../services/suscripcion-verification.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const verificacionService = new SuscripcionVerificationService(prisma);

/**
 * Middleware que verifica el estado de suscripción en CADA petición
 * Se ejecuta después del authMiddleware
 * 
 * IMPORTANTE: Este middleware se salta para SuperAdmins
 */
export async function verificarSuscripcionMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const user = (request as any).user;

    // Si no hay usuario (no debería pasar si authMiddleware se ejecutó primero)
    if (!user || !user.userId) {
      return reply.status(401).send({
        success: false,
        message: 'Usuario no autenticado',
      });
    }

    // Si es SuperAdmin, permitir acceso sin verificar suscripción
    if (user.rol === 'SUPER_ADMIN') {
      return; // Continuar con la petición
    }

    // Obtener el usuario con su negocio
    const usuario = await prisma.usuario.findUnique({
      where: { id: user.userId },
      include: { negocio: true },
    });

    if (!usuario) {
      return reply.status(404).send({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    // Si no tiene negocio, no puede acceder
    if (!usuario.negocio) {
      return reply.status(403).send({
        success: false,
        message: 'No tienes un negocio asociado',
        code: 'NO_BUSINESS',
      });
    }

    // VERIFICAR Y ACTUALIZAR estado de suscripción
    const verificacion = await verificacionService.verificarYActualizarSuscripcion(
      usuario.negocio.id
    );

    const estadoActual = verificacion.estadoActual;

    // Si la suscripción NO está activa, bloquear acceso
    if (estadoActual !== 'ACTIVA') {
      let mensaje = '';
      let code = '';

      switch (estadoActual) {
        case 'SIN_SUSCRIPCION':
          mensaje = 'Debes activar un código de suscripción para acceder al sistema';
          code = 'NO_SUBSCRIPTION';
          break;
        case 'VENCIDA':
          mensaje = `Tu suscripción ha vencido. Por favor, activa un nuevo código para continuar.`;
          code = 'SUBSCRIPTION_EXPIRED';
          break;
        case 'BLOQUEADA':
          mensaje = 'Tu suscripción ha sido bloqueada. Contacta al administrador.';
          code = 'SUBSCRIPTION_BLOCKED';
          break;
        case 'CANCELADA':
          mensaje = 'Tu suscripción ha sido cancelada. Contacta al administrador.';
          code = 'SUBSCRIPTION_CANCELLED';
          break;
        default:
          mensaje = 'No tienes acceso al sistema';
          code = 'NO_ACCESS';
      }

      return reply.status(403).send({
        success: false,
        message: mensaje,
        code,
        estadoSuscripcion: estadoActual,
        fechaVencimiento: verificacion.fechaVencimiento,
      });
    }

    // Si la suscripción está ACTIVA pero está por vencer (menos de 3 días)
    if (verificacion.diasRestantes !== null && verificacion.diasRestantes <= 3) {
      // No bloqueamos, pero agregamos una advertencia en el response
      (request as any).advertenciaSuscripcion = {
        diasRestantes: verificacion.diasRestantes,
        mensaje: `Tu suscripción vence en ${verificacion.diasRestantes} día(s)`,
      };
    }

    // Suscripción ACTIVA - Permitir acceso
    return;
  } catch (error: any) {
    console.error('Error en verificarSuscripcionMiddleware:', error);
    return reply.status(500).send({
      success: false,
      message: 'Error al verificar suscripción',
    });
  }
}
