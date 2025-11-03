// src/services/uso-recursos.service.ts

import prisma from '../database/prisma';

/**
 * Servicio para rastrear el uso mensual de recursos
 * Incrementa contadores cuando se crean citas o se envían notificaciones
 */
class UsoRecursosService {
  /**
   * Obtiene o crea el registro de uso para el mes actual
   */
  private async obtenerOCrearRegistroMesActual(negocioId: string) {
    const now = new Date();
    const mes = now.getMonth() + 1; // 1-12
    const anio = now.getFullYear();

    let usoRecursos = await prisma.usoRecursos.findUnique({
      where: {
        negocioId_mes_anio: {
          negocioId,
          mes,
          anio,
        },
      },
    });

    // Si no existe, crear el registro
    if (!usoRecursos) {
      usoRecursos = await prisma.usoRecursos.create({
        data: {
          negocioId,
          mes,
          anio,
          citasCreadas: 0,
          whatsappEnviados: 0,
          emailsEnviados: 0,
        },
      });
    }

    return usoRecursos;
  }

  /**
   * Incrementa el contador de citas creadas este mes
   */
  async incrementarCitas(negocioId: string): Promise<void> {
    const usoRecursos = await this.obtenerOCrearRegistroMesActual(negocioId);

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
   * Incrementa el contador de WhatsApp enviados este mes
   */
  async incrementarWhatsApp(negocioId: string): Promise<void> {
    const usoRecursos = await this.obtenerOCrearRegistroMesActual(negocioId);

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
   * Incrementa el contador de emails enviados este mes
   */
  async incrementarEmail(negocioId: string): Promise<void> {
    const usoRecursos = await this.obtenerOCrearRegistroMesActual(negocioId);

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

    const usoActual = await this.obtenerOCrearRegistroMesActual(negocioId);

    // Verificar si ya alcanzó el límite
    return usoActual.whatsappEnviados < negocio.limiteWhatsAppMes;
  }

  /**
   * Obtiene el uso actual del mes
   */
  async obtenerUsoActual(negocioId: string) {
    const usoRecursos = await this.obtenerOCrearRegistroMesActual(negocioId);

    return {
      mes: usoRecursos.mes,
      anio: usoRecursos.anio,
      citasCreadas: usoRecursos.citasCreadas,
      whatsappEnviados: usoRecursos.whatsappEnviados,
      emailsEnviados: usoRecursos.emailsEnviados,
    };
  }

  /**
   * Obtiene el historial de uso de los últimos meses
   */
  async obtenerHistorialUso(negocioId: string, meses: number = 6) {
    const registros = await prisma.usoRecursos.findMany({
      where: { negocioId },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      take: meses,
    });

    return registros.map((registro) => ({
      mes: registro.mes,
      anio: registro.anio,
      fecha: `${registro.mes}/${registro.anio}`,
      citasCreadas: registro.citasCreadas,
      whatsappEnviados: registro.whatsappEnviados,
      emailsEnviados: registro.emailsEnviados,
    }));
  }

  /**
   * Resetea los contadores mensuales (se ejecuta el día 1 de cada mes via CRON)
   * NOTA: No elimina registros, solo crea uno nuevo para el mes siguiente
   * El reseteo es automático porque cada mes tiene su propio registro
   */
  async verificarNuevoMes(negocioId: string): Promise<void> {
    // Este método solo asegura que existe un registro para el mes actual
    await this.obtenerOCrearRegistroMesActual(negocioId);
  }

  /**
   * Resetea contadores de todos los negocios (CRON job mensual)
   * En realidad no hace nada porque cada mes se crea un registro nuevo automáticamente
   */
  async resetearContadoresMensuales(): Promise<void> {
    // No es necesario hacer nada aquí
    // Cada mes tiene su propio registro en la tabla
    // Los registros antiguos se mantienen para historial
    console.log('Inicio de nuevo mes - Los contadores se resetean automáticamente por registro');
  }
}

export default new UsoRecursosService();
