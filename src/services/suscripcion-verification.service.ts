// src/services/suscripcion-verification.service.ts

import { PrismaClient, EstadoSuscripcion } from '@prisma/client';

export class SuscripcionVerificationService {
  constructor(private prisma: PrismaClient = prisma) {}

  /**
   * Verificar y actualizar el estado de suscripción de un negocio
   * Retorna true si la suscripción está ACTIVA y vigente
   */
  async verificarYActualizarSuscripcion(negocioId: string): Promise<{
    estadoAnterior: EstadoSuscripcion;
    estadoActual: EstadoSuscripcion;
    cambioEstado: boolean;
    fechaVencimiento: Date | null;
    diasRestantes: number | null;
  }> {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      include: {
        suscripcion: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    const estadoAnterior = negocio.estadoSuscripcion;
    let estadoActual = estadoAnterior;
    let cambioEstado = false;
    let fechaVencimiento: Date | null = null;

    // ✅ CORREGIDO: Verificar fecha de vencimiento en la tabla Suscripcion
    // Solo verificar si tiene suscripción activa
    if (estadoAnterior === EstadoSuscripcion.ACTIVA && negocio.suscripcion) {
      // La fecha de vencimiento REAL está en Suscripcion, no en Negocio
      fechaVencimiento = negocio.suscripcion.fechaVencimiento;
      
      const ahora = new Date();
      const fechaVencimientoDate = new Date(fechaVencimiento);

      // Si la fecha de vencimiento ya pasó
      if (fechaVencimientoDate < ahora) {
        // Actualizar estado del negocio a VENCIDA
        await this.prisma.negocio.update({
          where: { id: negocioId },
          data: {
            estadoSuscripcion: EstadoSuscripcion.VENCIDA,
          },
        });

        // Marcar la suscripción como inactiva
        await this.prisma.suscripcion.update({
          where: { id: negocio.suscripcion.id },
          data: {
            activa: false,
          },
        });

        // Crear registro en historial
        await this.prisma.historialSuscripcion.create({
          data: {
            suscripcionId: negocio.suscripcion.id,
            accion: 'VENCIMIENTO',
            descripcion: `Suscripción vencida el ${fechaVencimientoDate.toISOString()}`,
          },
        });

        estadoActual = EstadoSuscripcion.VENCIDA;
        cambioEstado = true;
      }
    }

    // Calcular días restantes
    let diasRestantes: number | null = null;
    if (fechaVencimiento && estadoActual === EstadoSuscripcion.ACTIVA) {
      const ahora = new Date();
      const fechaVencimientoDate = new Date(fechaVencimiento);
      const diffTime = fechaVencimientoDate.getTime() - ahora.getTime();
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      estadoAnterior,
      estadoActual,
      cambioEstado,
      fechaVencimiento,
      diasRestantes,
    };
  }

  /**
   * Verificar si un negocio tiene acceso al sistema
   * Retorna true solo si la suscripción está ACTIVA y NO ha vencido
   */
  async tieneAccesoAlSistema(negocioId: string): Promise<{
    tieneAcceso: boolean;
    estado: EstadoSuscripcion;
    mensaje: string;
    diasRestantes: number | null;
  }> {
    const verificacion = await this.verificarYActualizarSuscripcion(negocioId);

    let tieneAcceso = false;
    let mensaje = '';

    switch (verificacion.estadoActual) {
      case EstadoSuscripcion.ACTIVA:
        tieneAcceso = true;
        mensaje = verificacion.diasRestantes !== null
          ? `Suscripción activa. ${verificacion.diasRestantes} días restantes.`
          : 'Suscripción activa.';
        break;

      case EstadoSuscripcion.VENCIDA:
        tieneAcceso = false;
        mensaje = 'Tu suscripción ha expirado. Por favor, renueva tu plan.';
        break;

      case EstadoSuscripcion.SIN_SUSCRIPCION:
        tieneAcceso = false;
        mensaje = 'No tienes una suscripción activa. Por favor, activa un código.';
        break;

      case EstadoSuscripcion.BLOQUEADA:
        tieneAcceso = false;
        mensaje = 'Tu cuenta ha sido bloqueada. Contacta al soporte.';
        break;

      case EstadoSuscripcion.CANCELADA:
        tieneAcceso = false;
        mensaje = 'Tu suscripción ha sido cancelada.';
        break;

      default:
        tieneAcceso = false;
        mensaje = 'Estado de suscripción desconocido.';
    }

    return {
      tieneAcceso,
      estado: verificacion.estadoActual,
      mensaje,
      diasRestantes: verificacion.diasRestantes,
    };
  }

  /**
   * Verificar múltiples negocios a la vez (para tareas programadas)
   */
  async verificarTodosLosNegocios(): Promise<{
    total: number;
    actualizados: number;
    vencidos: number;
    detalles: Array<{
      negocioId: string;
      nombre: string;
      estadoAnterior: EstadoSuscripcion;
      estadoActual: EstadoSuscripcion;
    }>;
  }> {
    // ✅ CORREGIDO: Buscar negocios con suscripción activa (la tabla Suscripcion tiene la fecha real)
    const negocios = await this.prisma.negocio.findMany({
      where: {
        estadoSuscripcion: EstadoSuscripcion.ACTIVA,
        suscripcion: {
          isNot: null, // Tiene una suscripción
        },
      },
      include: {
        suscripcion: true,
      },
    });

    let actualizados = 0;
    let vencidos = 0;
    const detalles: Array<any> = [];

    for (const negocio of negocios) {
      const verificacion = await this.verificarYActualizarSuscripcion(negocio.id);

      if (verificacion.cambioEstado) {
        actualizados++;
        if (verificacion.estadoActual === EstadoSuscripcion.VENCIDA) {
          vencidos++;
        }

        detalles.push({
          negocioId: negocio.id,
          nombre: negocio.nombre,
          estadoAnterior: verificacion.estadoAnterior,
          estadoActual: verificacion.estadoActual,
        });
      }
    }

    return {
      total: negocios.length,
      actualizados,
      vencidos,
      detalles,
    };
  }
}
