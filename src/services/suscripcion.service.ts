import { PrismaClient, EstadoSuscripcion } from '@prisma/client';
import { CodigoSuscripcionRepository } from '../repositories/codigo-suscripcion.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import { SuscripcionRepository } from '../repositories/suscripcion.repository';
import planesService from './planes.service';
import {
  ActivarCodigoDto,
  ActivarCodigoResponse,
} from '../models/suscripcion.model';

/**
 * Jerarquía de planes (de menor a mayor)
 * Un plan superior tiene mayor valor numérico
 */
const JERARQUIA_PLANES: Record<string, number> = {
  'GRATIS': 0,
  'PRO_MENSUAL': 1,
  'PRO_ANUAL': 1, 
  'PRO_PLUS_MENSUAL': 2,
  'PRO_PLUS_ANUAL': 2,
  'PERSONALIZADO': 3,
};

/**
 * Compara dos planes y determina si el actual es estrictamente superior
 * @returns true si planActual es superior (no igual) al planNuevo
 */
function esPlanSuperior(planActual: string, planNuevo: string): boolean {
  const jerarquiaActual = JERARQUIA_PLANES[planActual] ?? 0;
  const jerarquiaNuevo = JERARQUIA_PLANES[planNuevo] ?? 0;
  return jerarquiaActual > jerarquiaNuevo;
}

export class SuscripcionService {
  private codigoRepository: CodigoSuscripcionRepository;
  private negocioRepository: NegocioRepository;
  private suscripcionRepository: SuscripcionRepository;

  constructor(private prisma: PrismaClient) {
    this.codigoRepository = new CodigoSuscripcionRepository(this.prisma);
    this.negocioRepository = new NegocioRepository(this.prisma);
    this.suscripcionRepository = new SuscripcionRepository(this.prisma);
  }

  async activarCodigo(
    usuarioId: string,
    dto: ActivarCodigoDto
  ): Promise<ActivarCodigoResponse> {
    const codigo = await this.codigoRepository.findByCodigo(dto.codigo);

    if (!codigo) {
      throw new Error('Código no encontrado');
    }

    if (codigo.usado && codigo.vecesUsado >= codigo.usoMaximo) {
      throw new Error('Este código ya fue utilizado');
    }

    if (codigo.fechaExpiracion && new Date(codigo.fechaExpiracion) < new Date()) {
      throw new Error('Este código ha expirado');
    }

    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);

    if (!negocio) {
      throw new Error('Negocio no encontrado para este usuario');
    }

    // ✅ Guardar en UTC - La conversión a zona horaria local se hace en el frontend
    // El servidor SIEMPRE debe estar configurado en UTC para consistencia global
    const fechaActivacion = new Date();

    const resultado = await this.prisma.$transaction(async (tx) => {
      const suscripcionExistente = await this.suscripcionRepository.findByNegocioId(
        negocio.id,
        tx
      );

      // 🎯 SISTEMA DE COLA: Verificar si el plan actual es superior al nuevo
      let enCola = false;
      let planActual: string | null = null;
      let fechaInicioPendiente: Date | undefined;

      if (suscripcionExistente && suscripcionExistente.activa) {
        const fechaVencimientoActual = new Date(suscripcionExistente.fechaVencimiento);
        const ahora = new Date();

        // Solo considerar cola si la suscripción actual NO ha vencido
        if (fechaVencimientoActual > ahora) {
          // ✅ Bug #9: Validar que codigoSuscripcion exista antes de acceder a plan
          if (!suscripcionExistente.codigoSuscripcion) {
            throw new Error('La suscripción existente no tiene un código asociado.');
          }
          
          planActual = suscripcionExistente.codigoSuscripcion.plan;
          
          // Comparar planes: si el actual es ESTRICTAMENTE superior (no igual), poner nuevo en cola
          // Si es del mismo nivel, se acumulará en lugar de ir en cola
          if (esPlanSuperior(planActual, codigo.plan)) {
            enCola = true;
            fechaInicioPendiente = new Date(fechaVencimientoActual);
          }
        }
      }

      // Calcular fecha de vencimiento
      let fechaVencimiento: Date;

      if (suscripcionExistente && suscripcionExistente.activa) {
        const fechaVencimientoActual = new Date(suscripcionExistente.fechaVencimiento);
        const ahora = new Date();

        if (enCola) {
          // Si va en cola, NO modificar fecha de vencimiento actual
          fechaVencimiento = fechaVencimientoActual;
        } else if (fechaVencimientoActual < ahora) {
          // Si ya venció, calcular desde ahora
          fechaVencimiento = new Date(ahora);
          fechaVencimiento.setDate(fechaVencimiento.getDate() + codigo.duracionDias);
        } else {
          // Si el nuevo plan es superior, ACUMULAR desde fecha de vencimiento
          fechaVencimiento = new Date(fechaVencimientoActual);
          fechaVencimiento.setDate(fechaVencimiento.getDate() + codigo.duracionDias);
          
          // ✅ Bug #13: Limpiar plan pendiente si existe (caso acumulación mismo/superior nivel)
          if (suscripcionExistente.planPendiente) {
            await tx.suscripcion.update({
              where: { negocioId: negocio.id },
              data: {
                planPendiente: null,
                codigoPendienteId: null,
                fechaInicioPendiente: null,
              },
            });
          }
        }
      } else {
        // Si NO tiene suscripción activa, calcular desde hoy
        fechaVencimiento = new Date(fechaActivacion);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + codigo.duracionDias);
      }

      let suscripcion;

      if (suscripcionExistente) {
        if (enCola) {
          // ⚠️ VALIDAR: No permitir múltiples planes en cola
          if (suscripcionExistente.planPendiente) {
            throw new Error(
              `Ya tienes un plan ${suscripcionExistente.planPendiente} programado para el ${new Date(suscripcionExistente.fechaInicioPendiente!).toLocaleDateString('es-ES')}. No puedes agregar otro plan a la cola hasta que este se active.`
            );
          }

          // 🎯 PONER EN COLA: Guardar como plan pendiente
          suscripcion = await tx.suscripcion.update({
            where: { negocioId: negocio.id },
            data: {
              planPendiente: codigo.plan,
              codigoPendienteId: codigo.id,
              fechaInicioPendiente: fechaInicioPendiente,
            },
          });

          await tx.historialSuscripcion.create({
            data: {
              suscripcionId: suscripcion.id,
              accion: 'PLAN_EN_COLA',
              descripcion: `Plan ${codigo.plan} guardado en cola. Se activará automáticamente el ${fechaInicioPendiente?.toLocaleDateString('es-ES')} cuando venza el plan actual (${planActual}).`,
              codigoUsado: codigo.codigo,
              realizadoPor: usuarioId,
            },
          });
        } else {
          // ✅ APLICAR INMEDIATAMENTE: Actualizar suscripción Y limpiar plan pendiente
          const updateData: any = {
            codigoId: codigo.id,
            fechaActivacion,
            fechaVencimiento,
            activa: true,
          };
          
          // 🧹 Limpiar plan pendiente si existía o si es plan superior
          if (suscripcionExistente.planPendiente || (planActual && esPlanSuperior(codigo.plan, planActual))) {
            updateData.planPendiente = null;
            updateData.codigoPendienteId = null;
            updateData.fechaInicioPendiente = null;
          }

          suscripcion = await this.suscripcionRepository.update(
            negocio.id,
            updateData,
            tx
          );

          // Registrar cancelación de plan pendiente si existía
          if (suscripcionExistente.planPendiente) {
            await tx.historialSuscripcion.create({
              data: {
                suscripcionId: suscripcion.id,
                accion: 'CAMBIO_PLAN',
                descripcion: `Plan pendiente ${suscripcionExistente.planPendiente} cancelado. Se aplicó plan superior ${codigo.plan} inmediatamente.`,
                codigoUsado: codigo.codigo,
                realizadoPor: usuarioId,
              },
            });
          }

          await tx.historialSuscripcion.create({
            data: {
              suscripcionId: suscripcion.id,
              accion: 'RENOVACION',
              descripcion: `Suscripción renovada con código ${codigo.codigo}. Plan: ${codigo.plan}`,
              codigoUsado: codigo.codigo,
              realizadoPor: usuarioId,
            },
          });
        }
      } else {
        suscripcion = await this.suscripcionRepository.create(
          {
            negocioId: negocio.id,
            codigoId: codigo.id,
            fechaActivacion,
            fechaVencimiento,
            activa: true,
          },
          tx
        );

        await tx.historialSuscripcion.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'ACTIVACION_CODIGO',
            descripcion: `Suscripción activada con código ${codigo.codigo}. Plan: ${codigo.plan}`,
            codigoUsado: codigo.codigo,
            realizadoPor: usuarioId,
          },
        });
      }

      // ✅ Bug #10: Solo marcar código como usado si NO va en cola
      if (!enCola) {
        await tx.codigoSuscripcion.update({
          where: { id: codigo.id },
          data: {
            vecesUsado: { increment: 1 },
            usado: true,
            fechaUso: new Date(),
          },
        });
      }

      await tx.negocio.update({
        where: { id: negocio.id },
        data: {
          estadoSuscripcion: EstadoSuscripcion.ACTIVA,
          codigoAplicado: true,
        },
      });

      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          primerLogin: false,
        },
      });

      return { suscripcion, fechaVencimiento, enCola, planActual, fechaInicioPendiente };
    });

    // 🔥 CRÍTICO: Asignar límites SOLO si NO está en cola
    if (!resultado.enCola) {
      await planesService.asignarLimitesPlan(negocio.id, codigo.plan);
    }

    const negocioActualizado = await this.negocioRepository.findById(negocio.id);

    // Obtener el plan actual para la respuesta
    const suscripcionConCodigo = await this.prisma.suscripcion.findUnique({
      where: { negocioId: negocio.id },
      include: { codigoSuscripcion: true },
    });

    return {
      success: true,
      data: {
        suscripcion: {
          id: resultado.suscripcion.id,
          fechaActivacion: resultado.suscripcion.fechaActivacion,
          fechaVencimiento: resultado.suscripcion.fechaVencimiento,
          plan: suscripcionConCodigo!.codigoSuscripcion.plan,
        },
        negocio: {
          estadoSuscripcion: negocioActualizado!.estadoSuscripcion,
        },
        // 🎯 Información de cola
        enCola: resultado.enCola,
        planActual: resultado.planActual,
        planPendiente: resultado.enCola ? codigo.plan : undefined,
        fechaActivacionPendiente: resultado.fechaInicioPendiente,
      },
      message: resultado.enCola
        ? `Plan ${codigo.plan} guardado en cola. Se activará automáticamente el ${resultado.fechaInicioPendiente?.toLocaleDateString('es-ES')} cuando venza tu plan actual (${resultado.planActual}).`
        : `¡Código activado exitosamente! Tu suscripción ${codigo.plan} estará activa hasta el ${resultado.fechaVencimiento.toLocaleDateString('es-ES')}`,
    };
  }
}
