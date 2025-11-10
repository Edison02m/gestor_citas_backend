// src/services/planes-scheduler.service.ts

import cron from 'node-cron';
import { PrismaClient, EstadoSuscripcion } from '@prisma/client';
import planesService from './planes.service';
import usoRecursosService from './uso-recursos.service';

const prisma = new PrismaClient();

/**
 * Servicio para manejar la activación automática de planes pendientes
 */
class PlanesSchedulerService {
  private isRunning = false;

  /**
   * Inicia el cron job que revisa planes pendientes cada hora
   */
  iniciar() {
    // Ejecutar cada hora a los 0 minutos
    cron.schedule('0 * * * *', async () => {
      console.log('🔄 [Scheduler] Verificando planes pendientes...');
      await this.procesarPlanesPendientes();
    });

    // También ejecutar cada día a medianoche
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 [Scheduler] Verificación diaria de planes pendientes y ciclos...');
      await this.procesarPlanesPendientes();
      
      // ✅ Verificar nuevos ciclos de UsoRecursos (reseteo mensual de límites)
      console.log('🔄 [Scheduler] Verificando nuevos ciclos de uso de recursos...');
      await usoRecursosService.verificarNuevosCiclos();
    });

    console.log('✅ Scheduler de planes iniciado');
  }

  /**
   * Procesa todas las suscripciones que tienen planes pendientes
   * y cuya fecha de inicio ya llegó
   */
  async procesarPlanesPendientes() {
    if (this.isRunning) {
      console.log('⏸️  [Scheduler] Ya hay un proceso en ejecución');
      return;
    }

    this.isRunning = true;

    try {
      const ahora = new Date();

      // Buscar suscripciones con plan pendiente cuya fecha de inicio ya pasó
      // Y que además la suscripción actual ya haya vencido
      const suscripcionesConPlanPendiente = await prisma.suscripcion.findMany({
        where: {
          planPendiente: { not: null },
          fechaInicioPendiente: { lte: ahora },
          fechaVencimiento: { lte: ahora }, // ✅ IMPORTANTE: Solo si el plan actual ya venció
          // ✅ REMOVED activa: true - Procesar incluso si ya venció (activa: false)
        },
        include: {
          codigoSuscripcion: true,
          codigoPendiente: true,
          negocio: {
            include: {
              usuario: true,
            },
          },
        },
      });

      console.log(
        `📋 [Scheduler] Encontradas ${suscripcionesConPlanPendiente.length} suscripciones con planes pendientes`
      );

      for (const suscripcion of suscripcionesConPlanPendiente) {
        try {
          await this.activarPlanPendiente(suscripcion);
        } catch (error: any) {
          console.error(
            `❌ [Scheduler] Error al activar plan pendiente para negocio ${suscripcion.negocioId}:`,
            error.message
          );
        }
      }

      // 🔧 Corregir inconsistencias: Suscripciones vencidas con activa=true
      await this.corregirInconsistencias();

      console.log('✅ [Scheduler] Procesamiento completado');
    } catch (error: any) {
      console.error('❌ [Scheduler] Error en procesamiento:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Corrige inconsistencias en suscripciones vencidas
   * (suscripciones con fechaVencimiento < ahora pero activa = true)
   */
  private async corregirInconsistencias() {
    const ahora = new Date();

    // Buscar suscripciones vencidas que aún estén marcadas como activas
    const suscripcionesInconsistentes = await prisma.suscripcion.findMany({
      where: {
        fechaVencimiento: { lt: ahora },
        activa: true,
      },
    });

    if (suscripcionesInconsistentes.length > 0) {
      console.log(
        `🔧 [Scheduler] Corrigiendo ${suscripcionesInconsistentes.length} suscripciones inconsistentes`
      );

      for (const suscripcion of suscripcionesInconsistentes) {
        await prisma.suscripcion.update({
          where: { id: suscripcion.id },
          data: { activa: false },
        });

        // También actualizar el estado del negocio
        await prisma.negocio.update({
          where: { id: suscripcion.negocioId },
          data: { estadoSuscripcion: EstadoSuscripcion.VENCIDA },
        });

        console.log(`✅ [Scheduler] Suscripción ${suscripcion.id} marcada como inactiva`);
      }
    }
  }

  /**
   * Activa un plan pendiente específico
   */
  private async activarPlanPendiente(suscripcion: any) {
    const { negocioId, planPendiente, codigoPendiente, negocio, fechaVencimiento } = suscripcion;

    // ✅ VALIDAR que la suscripción actual ya venció
    const ahora = new Date();
    if (new Date(fechaVencimiento) > ahora) {
      console.warn(
        `⏸️  [Scheduler] Suscripción ${suscripcion.id} aún no vence (${new Date(fechaVencimiento).toISOString()}). Esperando...`
      );
      return;
    }

    if (!codigoPendiente || !planPendiente) {
      console.warn(`⚠️  [Scheduler] Suscripción ${suscripcion.id} sin datos de plan pendiente`);
      return;
    }

    // ✅ Bug #14: Validar que el código no haya excedido su usoMaximo
    if (codigoPendiente.usado && codigoPendiente.vecesUsado >= codigoPendiente.usoMaximo) {
      console.error(
        `❌ [Scheduler] Código ${codigoPendiente.codigo} ya alcanzó su límite de uso (${codigoPendiente.vecesUsado}/${codigoPendiente.usoMaximo}). No se puede activar el plan pendiente.`
      );
      
      // Limpiar el plan pendiente ya que el código no se puede usar
      await prisma.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          planPendiente: null,
          codigoPendienteId: null,
          fechaInicioPendiente: null,
        },
      });
      
      return;
    }

    console.log(
      `🎯 [Scheduler] Activando plan ${planPendiente} para negocio ${negocio.nombre} (${negocioId})`
    );

    await prisma.$transaction(async (tx) => {
      // Calcular nueva fecha de vencimiento
      const fechaActivacion = new Date();
      const fechaVencimiento = new Date(fechaActivacion);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + codigoPendiente.duracionDias);

      // Actualizar suscripción: activar plan pendiente y limpiar cola
      await tx.suscripcion.update({
        where: { id: suscripcion.id },
        data: {
          codigoId: codigoPendiente.id,
          fechaActivacion,
          fechaVencimiento,
          activa: true,
          // Limpiar plan pendiente
          planPendiente: null,
          codigoPendienteId: null,
          fechaInicioPendiente: null,
        },
      });

      // ✅ Bug #12: Marcar código como usado al activar automáticamente
      await tx.codigoSuscripcion.update({
        where: { id: codigoPendiente.id },
        data: {
          vecesUsado: { increment: 1 },
          usado: true,
          fechaUso: new Date(),
        },
      });

      // Registrar en historial
      await tx.historialSuscripcion.create({
        data: {
          suscripcionId: suscripcion.id,
          accion: 'PLAN_ACTIVADO_AUTOMATICAMENTE',
          descripcion: `Plan ${planPendiente} activado automáticamente. Vence el ${fechaVencimiento.toLocaleDateString('es-ES')}`,
          codigoUsado: codigoPendiente.codigo,
          // ✅ Bug #11: Usar optional chaining con fallback
          realizadoPor: negocio.usuario?.id || negocio.id,
        },
      });

      // Actualizar estado del negocio
      await tx.negocio.update({
        where: { id: negocioId },
        data: {
          estadoSuscripcion: EstadoSuscripcion.ACTIVA,
        },
      });
    });

    // Asignar límites del nuevo plan
    await planesService.asignarLimitesPlan(negocioId, planPendiente as any);

    console.log(`✅ [Scheduler] Plan ${planPendiente} activado para ${negocio.nombre}`);
  }

  /**
   * Método manual para testing
   */
  async procesarManualmente() {
    console.log('🔧 [Scheduler] Procesamiento manual iniciado');
    await this.procesarPlanesPendientes();
  }
}

export default new PlanesSchedulerService();
