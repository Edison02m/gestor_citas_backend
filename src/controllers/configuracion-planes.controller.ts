// src/controllers/configuracion-planes.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../database/prisma';
import { PlanSuscripcion } from '@prisma/client';

interface ActualizarPlanRequest {
  Params: {
    planId: PlanSuscripcion;
  };
  Body: {
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
    nombre?: string;
    descripcion?: string;
  };
}

/**
 * Controlador para gestionar la configuración de planes
 * Solo accesible para Super Admins
 */
export class ConfiguracionPlanesController {
  /**
   * GET /api/super-admin/planes/configuracion
   * Obtener configuración de todos los planes
   */
  async obtenerConfiguracionPlanes(
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const planes = await prisma.configuracionPlanes.findMany({
        orderBy: {
          precio: 'asc',
        },
      });

      return reply.status(200).send({
        success: true,
        data: planes.map((plan) => ({
          ...plan,
          precio: Number(plan.precio),
        })),
      });
    } catch (error: any) {
      console.error('Error al obtener configuración de planes:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener configuración de planes',
      });
    }
  }

  /**
   * GET /api/super-admin/planes/configuracion/:planId
   * Obtener configuración de un plan específico
   */
  async obtenerConfiguracionPlan(
    request: FastifyRequest<{ Params: { planId: PlanSuscripcion } }>,
    reply: FastifyReply
  ) {
    try {
      const { planId } = request.params;

      const plan = await prisma.configuracionPlanes.findUnique({
        where: { plan: planId },
      });

      if (!plan) {
        return reply.status(404).send({
          success: false,
          message: 'Plan no encontrado',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          ...plan,
          precio: Number(plan.precio),
        },
      });
    } catch (error: any) {
      console.error('Error al obtener configuración del plan:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener configuración del plan',
      });
    }
  }

  /**
   * PUT /api/super-admin/planes/configuracion/:planId
   * Actualizar configuración de un plan
   */
  async actualizarConfiguracionPlan(
    request: FastifyRequest<ActualizarPlanRequest>,
    reply: FastifyReply
  ) {
    try {
      const { planId } = request.params;
      const datos = request.body;

      // Validaciones
      if (datos.duracionDias <= 0) {
        return reply.status(400).send({
          success: false,
          message: 'La duración debe ser mayor a 0 días',
        });
      }

      if (datos.precio < 0) {
        return reply.status(400).send({
          success: false,
          message: 'El precio no puede ser negativo',
        });
      }

      // Verificar que el plan existe
      const planExistente = await prisma.configuracionPlanes.findUnique({
        where: { plan: planId },
      });

      if (!planExistente) {
        return reply.status(404).send({
          success: false,
          message: 'Plan no encontrado',
        });
      }

      // Actualizar configuración
      const planActualizado = await prisma.configuracionPlanes.update({
        where: { plan: planId },
        data: {
          limiteSucursales: datos.limiteSucursales,
          limiteEmpleados: datos.limiteEmpleados,
          limiteServicios: datos.limiteServicios,
          limiteClientes: datos.limiteClientes,
          limiteCitasMes: datos.limiteCitasMes,
          limiteWhatsAppMes: datos.limiteWhatsAppMes,
          limiteEmailMes: datos.limiteEmailMes,
          reportesAvanzados: datos.reportesAvanzados,
          duracionDias: datos.duracionDias,
          precio: datos.precio,
          ...(datos.nombre && { nombre: datos.nombre }),
          ...(datos.descripcion && { descripcion: datos.descripcion }),
        },
      });

      console.log(`✅ Plan ${planId} actualizado por Super Admin`);

      // 🔄 SINCRONIZAR LÍMITES CON TODOS LOS NEGOCIOS QUE TIENEN ESTE PLAN
      const negociosActualizados = await prisma.negocio.updateMany({
        where: {
          suscripcion: {
            codigoSuscripcion: {
              plan: planId,
            },
            fechaVencimiento: {
              gte: new Date(), // Solo negocios con suscripción activa
            },
          },
        },
        data: {
          limiteSucursales: datos.limiteSucursales,
          limiteEmpleados: datos.limiteEmpleados,
          limiteServicios: datos.limiteServicios,
          limiteClientes: datos.limiteClientes,
          limiteCitasMes: datos.limiteCitasMes,
          limiteWhatsAppMes: datos.limiteWhatsAppMes,
          limiteEmailMes: datos.limiteEmailMes,
        },
      });

      console.log(
        `✅ Límites sincronizados en ${negociosActualizados.count} negocios con plan ${planId}`
      );

      return reply.status(200).send({
        success: true,
        message: `Configuración de plan actualizada correctamente. ${negociosActualizados.count} negocios sincronizados.`,
        data: {
          ...planActualizado,
          precio: Number(planActualizado.precio),
          negociosActualizados: negociosActualizados.count,
        },
      });
    } catch (error: any) {
      console.error('Error al actualizar configuración del plan:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al actualizar configuración del plan',
      });
    }
  }

  /**
   * GET /api/super-admin/planes/estadisticas
   * Obtener estadísticas de uso de planes
   */
  async obtenerEstadisticasPlanes(
    _request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      // Contar negocios por plan
      const negocios = await prisma.negocio.findMany({
        select: {
          limiteSucursales: true,
          limiteEmpleados: true,
          reportesAvanzados: true,
        },
      });

      // Agrupar por tipo de plan basado en los límites
      const estadisticas = {
        GRATIS: 0,
        PRO: 0,
        PRO_PLUS: 0,
        PERSONALIZADO: 0,
        total: negocios.length,
      };

      negocios.forEach((negocio) => {
        if (negocio.reportesAvanzados) {
          estadisticas.PRO_PLUS++;
        } else if (negocio.limiteSucursales === 1) {
          estadisticas.GRATIS++;
        } else if (negocio.limiteSucursales === 5) {
          estadisticas.PRO++;
        } else {
          estadisticas.PERSONALIZADO++;
        }
      });

      return reply.status(200).send({
        success: true,
        data: estadisticas,
      });
    } catch (error: any) {
      console.error('Error al obtener estadísticas de planes:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al obtener estadísticas',
      });
    }
  }
}

export default new ConfiguracionPlanesController();
