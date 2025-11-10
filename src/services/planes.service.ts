// src/services/planes.service.ts

import prisma from '../database/prisma';
import { PlanSuscripcion } from '@prisma/client';

/**
 * Configuración de límites y características por plan
 */
interface ConfiguracionPlan {
  limiteSucursales: number | null;
  limiteEmpleados: number | null;
  limiteServicios: number | null;
  limiteClientes: number | null;
  limiteCitasMes: number | null;
  limiteWhatsAppMes: number | null;
  limiteEmailMes: number | null;
  reportesAvanzados: boolean;
  duracionDias: number;
  precio: number;
}

/**
 * Servicio para gestionar planes de suscripción
 * Asigna límites, cambia planes y verifica vencimientos
 * AHORA LEE LA CONFIGURACIÓN DESDE LA BASE DE DATOS (ConfiguracionPlanes)
 */
class PlanesService {
  /**
   * Obtiene la configuración de límites según el plan desde la base de datos
   */
  private async obtenerConfiguracionPlan(plan: PlanSuscripcion): Promise<ConfiguracionPlan> {
    const config = await prisma.configuracionPlanes.findUnique({
      where: { plan },
    });

    if (!config) {
      throw new Error(`Configuración de plan no encontrada: ${plan}`);
    }

    return {
      limiteSucursales: config.limiteSucursales,
      limiteEmpleados: config.limiteEmpleados,
      limiteServicios: config.limiteServicios,
      limiteClientes: config.limiteClientes,
      limiteCitasMes: config.limiteCitasMes,
      limiteWhatsAppMes: config.limiteWhatsAppMes,
      limiteEmailMes: config.limiteEmailMes,
      reportesAvanzados: config.reportesAvanzados,
      duracionDias: config.duracionDias,
      precio: Number(config.precio),
    };
  }

  /**
   * Asigna los límites de un plan a un negocio
   */
  async asignarLimitesPlan(
    negocioId: string,
    plan: PlanSuscripcion
  ): Promise<void> {
    const config = await this.obtenerConfiguracionPlan(plan);

    await prisma.negocio.update({
      where: { id: negocioId },
      data: {
        limiteSucursales: config.limiteSucursales,
        limiteEmpleados: config.limiteEmpleados,
        limiteServicios: config.limiteServicios,
        limiteClientes: config.limiteClientes,
        limiteCitasMes: config.limiteCitasMes,
        limiteWhatsAppMes: config.limiteWhatsAppMes,
        limiteEmailMes: config.limiteEmailMes,
        reportesAvanzados: config.reportesAvanzados,
      },
    });
  }

  /**
   * Cambia el plan de un negocio (upgrade o downgrade)
   */
  async cambiarPlan(
    negocioId: string,
    nuevoPlan: PlanSuscripcion
  ): Promise<void> {
    // Asignar nuevos límites
    await this.asignarLimitesPlan(negocioId, nuevoPlan);

    // Actualizar el estado de suscripción si es necesario
    if (nuevoPlan === 'GRATIS') {
      await prisma.negocio.update({
        where: { id: negocioId },
        data: {
          estadoSuscripcion: 'SIN_SUSCRIPCION',
        },
      });
    } else {
      await prisma.negocio.update({
        where: { id: negocioId },
        data: {
          estadoSuscripcion: 'ACTIVA',
        },
      });
    }
  }

  /**
   * Obtiene la información de todos los planes disponibles desde la base de datos
   */
  async obtenerPlanesDisponibles() {
    const planesDB = await prisma.configuracionPlanes.findMany({
      orderBy: {
        precio: 'asc',
      },
    });

    return planesDB.map((plan) => {
      const precioNum = Number(plan.precio);
      
      // Determinar periodo
      let periodo: 'gratis' | 'mensual' | 'anual' = 'mensual';
      if (plan.duracionDias === 14) {
        periodo = 'gratis';
      } else if (plan.duracionDias === 365) {
        periodo = 'anual';
      }
      
      // Construir características según el plan
      const caracteristicas: string[] = [];
      
      // Características comunes
      caracteristicas.push('✨ Gestión de agenda inteligente');
      caracteristicas.push('📱 Notificaciones automáticas');
      caracteristicas.push('🔒 Datos seguros y encriptados');
      caracteristicas.push('💬 Integración con WhatsApp');
      caracteristicas.push('📊 Dashboard en tiempo real');
      
      // Características específicas según el plan
      if (plan.plan === 'GRATIS') {
        caracteristicas.push('🎯 Perfecto para empezar');
        caracteristicas.push('⏰ Sin necesidad de tarjeta');
      } else if (plan.plan.startsWith('PRO_PLUS')) {
        caracteristicas.push('♾️ Recursos ilimitados');
        caracteristicas.push('📈 Reportes avanzados');
        caracteristicas.push('🎯 Análisis de rendimiento');
        caracteristicas.push('📊 Exportación a Excel');
        caracteristicas.push('⭐ Soporte prioritario');
      } else if (plan.plan.startsWith('PRO_')) {
        caracteristicas.push('🏢 Múltiples sucursales');
        caracteristicas.push('👥 Equipo completo');
        caracteristicas.push('📊 Estadísticas detalladas');
      }
      
      // Marcar PRO MENSUAL como popular
      const esPopular = plan.plan === 'PRO_MENSUAL';

      const result: any = {
        id: plan.plan,
        nombre: plan.nombre,
        descripcion: plan.descripcion,
        precio: precioNum,
        periodo,
        caracteristicas,
        limiteSucursales: plan.limiteSucursales === null ? 'ilimitado' : plan.limiteSucursales,
        limiteEmpleados: plan.limiteEmpleados === null ? 'ilimitado' : plan.limiteEmpleados,
        limiteServicios: plan.limiteServicios === null ? 'ilimitado' : plan.limiteServicios,
        limiteClientes: plan.limiteClientes === null ? 'ilimitado' : plan.limiteClientes,
        limiteCitasMes: plan.limiteCitasMes === null ? 'ilimitado' : plan.limiteCitasMes,
        limiteWhatsAppMes: plan.limiteWhatsAppMes === null ? 'ilimitado' : plan.limiteWhatsAppMes,
        limiteEmailMes: plan.limiteEmailMes === null ? 'ilimitado' : plan.limiteEmailMes,
        reportesAvanzados: plan.reportesAvanzados,
        esPopular,
      };

      return result;
    });
  }

  /**
   * Verifica y actualiza suscripciones vencidas (CRON job diario)
   */
  async verificarSuscripcionesVencidas(): Promise<void> {
    const now = new Date();

    // Buscar suscripciones activas que ya vencieron
    const suscripcionesVencidas = await prisma.suscripcion.findMany({
      where: {
        activa: true,
        fechaVencimiento: {
          lt: now,
        },
      },
      include: {
        negocio: true,
      },
    });

    for (const suscripcion of suscripcionesVencidas) {
      // Marcar suscripción como inactiva
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          activa: false,
        },
      });

      // Cambiar estado del negocio a VENCIDA
      await prisma.negocio.update({
        where: { id: suscripcion.negocioId },
        data: {
          estadoSuscripcion: 'VENCIDA',
        },
      });

      // Asignar límites de plan GRATIS
      await this.asignarLimitesPlan(suscripcion.negocioId, 'GRATIS');

      // Registrar en historial
      await prisma.historialSuscripcion.create({
        data: {
          suscripcionId: suscripcion.id,
          accion: 'VENCIMIENTO',
          descripcion: `La suscripción venció el ${suscripcion.fechaVencimiento.toLocaleDateString()}`,
        },
      });

      console.log(
        `Suscripción vencida para negocio: ${suscripcion.negocio.nombre}`
      );
    }

    console.log(
      `Verificación de vencimientos completada. ${suscripcionesVencidas.length} suscripciones procesadas.`
    );
  }

  /**
   * Obtiene el plan actual de un negocio
   */
  async obtenerPlanActual(negocioId: string) {
    const negocio = await prisma.negocio.findUnique({
      where: { id: negocioId },
      include: {
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

    if (!negocio.suscripcion) {
      return {
        plan: 'GRATIS',
        activo: true,
        diasRestantes: null,
      };
    }

    const now = new Date();
    const diasRestantes = Math.ceil(
      (negocio.suscripcion.fechaVencimiento.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      plan: negocio.suscripcion.codigoSuscripcion.plan,
      activo: negocio.suscripcion.activa,
      fechaVencimiento: negocio.suscripcion.fechaVencimiento,
      diasRestantes,
      renovacionAuto: negocio.suscripcion.renovacionAuto,
    };
  }
}

export default new PlanesService();
