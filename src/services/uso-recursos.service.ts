// src/services/uso-recursos.service.ts

import prisma from '../database/prisma';

/**
 * Servicio para rastrear el uso de recursos por ciclo de suscripción
 * Incrementa contadores cuando se crean citas o se envían notificaciones
 * 
 * IMPORTANTE: Los límites SIEMPRE se resetean cada 30 días (mensualmente),
 * independientemente de si el plan es mensual o anual.
 * 
 * - Plan MENSUAL: Paga cada 30 días + límites cada 30 días
 * - Plan ANUAL: Paga 1 año (365 días) + límites cada 30 días
 */
class UsoRecursosService {
  /**
   * Calcula las fechas de inicio y fin del ciclo actual basado en la suscripción
   */
  private async calcularCicloActual(negocioId: string): Promise<{ cicloInicio: Date; cicloFin: Date } | null> {
    // Obtener la suscripción activa del negocio
    const suscripcion = await prisma.suscripcion.findFirst({
      where: {
        negocioId,
        activa: true,
        fechaVencimiento: {
          gte: new Date(), // No ha vencido
        },
      },
      include: {
        codigoSuscripcion: true,
      },
    });

    if (!suscripcion) {
      return null; // No hay suscripción activa
    }

    const { fechaActivacion } = suscripcion;
    const now = new Date();

    // Determinar la duración del ciclo (SIEMPRE 30 días para límites mensuales)
    const duracionCicloDias = this.obtenerDuracionCiclo();

    // Calcular cuántos ciclos completos han pasado desde la activación
    const diasDesdeActivacion = Math.floor((now.getTime() - fechaActivacion.getTime()) / (1000 * 60 * 60 * 24));
    const ciclosCompletos = Math.floor(diasDesdeActivacion / duracionCicloDias);

    // Calcular el inicio del ciclo actual (mantiene la hora de activación original)
    const cicloInicio = new Date(fechaActivacion);
    cicloInicio.setDate(cicloInicio.getDate() + (ciclosCompletos * duracionCicloDias));

    // Calcular el fin del ciclo actual (un milisegundo antes del próximo ciclo)
    const cicloFin = new Date(cicloInicio);
    cicloFin.setDate(cicloFin.getDate() + duracionCicloDias);
    cicloFin.setMilliseconds(cicloFin.getMilliseconds() - 1);

    return { cicloInicio, cicloFin };
  }

  /**
   * Obtiene la duración del ciclo en días según el plan
   * 
   * IMPORTANTE: Los límites SIEMPRE se resetean cada 30 días (mensualmente),
   * independientemente de si el plan es mensual o anual.
   * 
   * - Plan MENSUAL: Paga cada 30 días + límites cada 30 días
   * - Plan ANUAL: Paga 1 año (365 días) + límites cada 30 días
   */
  private obtenerDuracionCiclo(): number {
    // TODOS los planes tienen ciclos de límites mensuales (30 días)
    // La duración de la suscripción (30 o 365 días) está en fechaVencimiento
    return 30;
  }

  /**
   * Obtiene o crea el registro de uso para el ciclo actual
   */
  private async obtenerOCrearRegistroCicloActual(negocioId: string) {
    const ciclo = await this.calcularCicloActual(negocioId);

    if (!ciclo) {
      throw new Error('No hay suscripción activa para este negocio');
    }

    const { cicloInicio, cicloFin } = ciclo;

    let usoRecursos = await prisma.usoRecursos.findUnique({
      where: {
        negocioId_cicloInicio: {
          negocioId,
          cicloInicio,
        },
      },
    });

    // Si no existe, crear el registro
    if (!usoRecursos) {
      usoRecursos = await prisma.usoRecursos.create({
        data: {
          negocioId,
          cicloInicio,
          cicloFin,
          citasCreadas: 0,
          whatsappEnviados: 0,
          emailsEnviados: 0,
        },
      });
    }

    return usoRecursos;
  }

  /**
   * Incrementa el contador de citas creadas en el ciclo actual
   */
  async incrementarCitas(negocioId: string): Promise<void> {
    const usoRecursos = await this.obtenerOCrearRegistroCicloActual(negocioId);

    await prisma.usoRecursos.update({
      where: { id: usoRecursos.id },
      data: {
        citasCreadas: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Incrementa el contador de WhatsApp enviados en el ciclo actual
   */
  async incrementarWhatsApp(negocioId: string): Promise<void> {
    const usoRecursos = await this.obtenerOCrearRegistroCicloActual(negocioId);

    await prisma.usoRecursos.update({
      where: { id: usoRecursos.id },
      data: {
        whatsappEnviados: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Incrementa el contador de emails enviados en el ciclo actual
   */
  async incrementarEmail(negocioId: string): Promise<void> {
    const usoRecursos = await this.obtenerOCrearRegistroCicloActual(negocioId);

    await prisma.usoRecursos.update({
      where: { id: usoRecursos.id },
      data: {
        emailsEnviados: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Verifica si puede enviar WhatsApp según el límite del plan
   */
  async puedeEnviarWhatsApp(negocioId: string): Promise<boolean> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { limiteWhatsAppMes: true },
    });

    // Si limiteWhatsAppMes es null = ilimitado (PRO PLUS)
    if (!negocio || negocio.limiteWhatsAppMes === null) {
      return true;
    }

    // Si el límite es 0 o negativo, no puede enviar
    if (negocio.limiteWhatsAppMes <= 0) {
      return false;
    }

    const usoActual = await this.obtenerOCrearRegistroCicloActual(negocioId);

    // Verificar si ya alcanzó el límite
    return usoActual.whatsappEnviados < negocio.limiteWhatsAppMes;
  }

  /**
   * Obtiene el uso actual del ciclo
   */
  async obtenerUsoActual(negocioId: string) {
    const usoRecursos = await this.obtenerOCrearRegistroCicloActual(negocioId);

    return {
      cicloInicio: usoRecursos.cicloInicio,
      cicloFin: usoRecursos.cicloFin,
      citasCreadas: usoRecursos.citasCreadas,
      whatsappEnviados: usoRecursos.whatsappEnviados,
      emailsEnviados: usoRecursos.emailsEnviados,
    };
  }

  /**
   * Obtiene el historial de uso de los últimos ciclos
   */
  async obtenerHistorialUso(negocioId: string, ciclos: number = 6) {
    const registros = await prisma.usoRecursos.findMany({
      where: { negocioId },
      orderBy: { cicloInicio: 'desc' },
      take: ciclos,
    });

    return registros.map((registro) => ({
      cicloInicio: registro.cicloInicio,
      cicloFin: registro.cicloFin,
      citasCreadas: registro.citasCreadas,
      whatsappEnviados: registro.whatsappEnviados,
      emailsEnviados: registro.emailsEnviados,
    }));
  }

  /**
   * Verifica y crea registros para nuevos ciclos (se ejecuta diariamente via CRON)
   * Revisa todos los negocios activos y crea un registro nuevo si están en un nuevo ciclo
   */
  async verificarNuevosCiclos(): Promise<void> {
    const suscripcionesActivas = await prisma.suscripcion.findMany({
      where: {
        activa: true,
        fechaVencimiento: {
          gte: new Date(),
        },
      },
      include: {
        codigoSuscripcion: true,
      },
    });

    for (const suscripcion of suscripcionesActivas) {
      try {
        // Intentar obtener o crear el registro del ciclo actual
        await this.obtenerOCrearRegistroCicloActual(suscripcion.negocioId);
      } catch (error) {
        console.error(`Error al verificar ciclo para negocio ${suscripcion.negocioId}:`, error);
      }
    }

    console.log(`Verificados ${suscripcionesActivas.length} negocios para nuevos ciclos`);
  }

  /**
   * Obtiene información del ciclo actual para un negocio
   */
  async obtenerInfoCiclo(negocioId: string) {
    const ciclo = await this.calcularCicloActual(negocioId);

    if (!ciclo) {
      return null;
    }

    const now = new Date();
    const diasRestantes = Math.ceil((ciclo.cicloFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      cicloInicio: ciclo.cicloInicio,
      cicloFin: ciclo.cicloFin,
      diasRestantes,
    };
  }
}

export default new UsoRecursosService();
