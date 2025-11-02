// src/services/limites.service.ts

import prisma from '../database/prisma';

/**
 * Servicio para validar límites del plan de suscripción
 * Valida antes de crear recursos (sucursales, empleados, servicios, clientes, citas, WhatsApp)
 */
class LimitesService {
  /**
   * Valida si el negocio puede crear una nueva sucursal
   */
  async validarLimiteSucursales(negocioId: string): Promise<void> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      include: { sucursales: true },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Si limiteSucursales es null = ilimitado (PRO PLUS)
    if (negocio.limiteSucursales === null) {
      return;
    }

    const sucursalesActuales = negocio.sucursales.length;

    if (sucursalesActuales >= negocio.limiteSucursales) {
      throw new Error(
        `Has alcanzado el límite de sucursales de tu plan (${negocio.limiteSucursales}/${negocio.limiteSucursales}). Actualiza tu plan para agregar más sucursales.`
      );
    }
  }

  /**
   * Valida si el negocio puede crear un nuevo empleado
   */
  async validarLimiteEmpleados(negocioId: string): Promise<void> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      include: { empleados: true },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Si limiteEmpleados es null = ilimitado (PRO PLUS)
    if (negocio.limiteEmpleados === null) {
      return;
    }

    const empleadosActuales = negocio.empleados.length;

    if (empleadosActuales >= negocio.limiteEmpleados) {
      throw new Error(
        `Has alcanzado el límite de empleados de tu plan (${negocio.limiteEmpleados}/${negocio.limiteEmpleados}). Actualiza tu plan para agregar más empleados.`
      );
    }
  }

  /**
   * Valida si el negocio puede crear un nuevo servicio
   */
  async validarLimiteServicios(negocioId: string): Promise<void> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      include: { servicios: true },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Si limiteServicios es null = ilimitado (PRO PLUS)
    if (negocio.limiteServicios === null) {
      return;
    }

    const serviciosActuales = negocio.servicios.length;

    if (serviciosActuales >= negocio.limiteServicios) {
      throw new Error(
        `Has alcanzado el límite de servicios de tu plan (${negocio.limiteServicios}/${negocio.limiteServicios}). Actualiza tu plan para agregar más servicios.`
      );
    }
  }

  /**
   * Valida si el negocio puede crear un nuevo cliente
   */
  async validarLimiteClientes(negocioId: string): Promise<void> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { limiteClientes: true },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Si limiteClientes es null = ilimitado (PRO PLUS)
    if (negocio.limiteClientes === null) {
      return;
    }

    const clientesActuales = await prisma.cliente.count({
      where: { negocioId },
    });

    if (clientesActuales >= negocio.limiteClientes) {
      throw new Error(
        `Has alcanzado el límite de clientes de tu plan (${negocio.limiteClientes}/${negocio.limiteClientes}). Actualiza tu plan para agregar más clientes.`
      );
    }
  }

  /**
   * Valida si el negocio puede crear una nueva cita este mes
   */
  async validarLimiteCitasMes(negocioId: string): Promise<void> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { limiteCitasMes: true },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Si limiteCitasMes es null = ilimitado (PRO y PRO PLUS)
    if (negocio.limiteCitasMes === null) {
      return;
    }

    // Obtener mes y año actual
    const now = new Date();
    const mes = now.getMonth() + 1; // 1-12
    const anio = now.getFullYear();

    // Buscar registro de uso del mes actual
    const usoRecursos = await prisma.usoRecursos.findUnique({
      where: {
        negocioId_mes_anio: {
          negocioId,
          mes,
          anio,
        },
      },
    });

    const citasCreadas = usoRecursos?.citasCreadas || 0;

    if (citasCreadas >= negocio.limiteCitasMes) {
      throw new Error(
        `Has alcanzado el límite de citas mensuales de tu plan (${negocio.limiteCitasMes}/${negocio.limiteCitasMes}). Actualiza tu plan para crear más citas este mes.`
      );
    }
  }

  /**
   * Valida si el negocio puede enviar un WhatsApp este mes
   */
  async validarLimiteWhatsApp(negocioId: string): Promise<void> {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      select: { limiteWhatsAppMes: true },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Si limiteWhatsAppMes es null:
    // - En GRATIS = no tiene WhatsApp (null significa prohibido)
    // - En PRO PLUS = ilimitado (null significa ilimitado)
    // Necesitamos verificar el plan para distinguir

    // Si es null y no tiene ningún registro de uso, asumimos que no tiene WhatsApp (GRATIS)
    if (negocio.limiteWhatsAppMes === null) {
      // Aquí podrías verificar el plan específico si quieres ser más estricto
      // Por ahora, si es null, permitimos (PRO PLUS ilimitado)
      return;
    }

    // Obtener mes y año actual
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    // Buscar registro de uso del mes actual
    const usoRecursos = await prisma.usoRecursos.findUnique({
      where: {
        negocioId_mes_anio: {
          negocioId,
          mes,
          anio,
        },
      },
    });

    const whatsappEnviados = usoRecursos?.whatsappEnviados || 0;

    if (whatsappEnviados >= negocio.limiteWhatsAppMes) {
      throw new Error(
        `Has alcanzado el límite de WhatsApp mensuales de tu plan (${negocio.limiteWhatsAppMes}/${negocio.limiteWhatsAppMes}). Actualiza tu plan para enviar más mensajes este mes.`
      );
    }
  }

  /**
   * Obtiene información resumida de los límites actuales
   */
  async obtenerResumenLimites(negocioId: string) {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      include: {
        sucursales: true,
        empleados: true,
        servicios: true,
        suscripcion: {
          include: {
            codigoSuscripcion: true,
          },
        },
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    const clientesActuales = await prisma.cliente.count({
      where: { negocioId },
    });

    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    const usoRecursos = await prisma.usoRecursos.findUnique({
      where: {
        negocioId_mes_anio: {
          negocioId,
          mes,
          anio,
        },
      },
    });

    // Calcular porcentaje con redondeo a 0 decimales
    const calcularPorcentaje = (usado: number, limite: number | null): number => {
      if (limite === null) return 0;
      return Math.round((usado / limite) * 100);
    };

    // Contar emails enviados este mes usando RegistroEnvio
    const emailsEnviados = await prisma.registroEnvio.count({
      where: {
        negocioId,
        tipo: 'EMAIL',
        exitoso: true,
        createdAt: {
          gte: new Date(anio, mes - 1, 1, 0, 0, 0),
          lte: new Date(anio, mes, 0, 23, 59, 59),
        },
      },
    });

    return {
      sucursales: {
        usado: negocio.sucursales.length,
        limite: negocio.limiteSucursales,
        porcentaje: calcularPorcentaje(negocio.sucursales.length, negocio.limiteSucursales),
      },
      empleados: {
        usado: negocio.empleados.length,
        limite: negocio.limiteEmpleados,
        porcentaje: calcularPorcentaje(negocio.empleados.length, negocio.limiteEmpleados),
      },
      servicios: {
        usado: negocio.servicios.length,
        limite: negocio.limiteServicios,
        porcentaje: calcularPorcentaje(negocio.servicios.length, negocio.limiteServicios),
      },
      clientes: {
        usado: clientesActuales,
        limite: negocio.limiteClientes,
        porcentaje: calcularPorcentaje(clientesActuales, negocio.limiteClientes),
      },
      citasMes: {
        usado: usoRecursos?.citasCreadas || 0,
        limite: negocio.limiteCitasMes,
        porcentaje: calcularPorcentaje(usoRecursos?.citasCreadas || 0, negocio.limiteCitasMes),
      },
      whatsappMes: {
        usado: usoRecursos?.whatsappEnviados || 0,
        limite: negocio.limiteWhatsAppMes,
        porcentaje: calcularPorcentaje(usoRecursos?.whatsappEnviados || 0, negocio.limiteWhatsAppMes),
      },
      emailMes: {
        usado: emailsEnviados,
        limite: negocio.limiteEmailMes,
        porcentaje: calcularPorcentaje(emailsEnviados, negocio.limiteEmailMes),
      },
      planActual: negocio.suscripcion?.codigoSuscripcion?.plan || 'GRATIS',
    };
  }
}

export default new LimitesService();
