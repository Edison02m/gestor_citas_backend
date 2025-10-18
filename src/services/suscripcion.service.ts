// src/services/suscripcion.service.ts

import { PrismaClient, EstadoSuscripcion, PlanSuscripcion } from '@prisma/client';
import { SuscripcionVerificationService } from './suscripcion-verification.service';
import { SuscripcionRepository } from '../repositories/suscripcion.repository';
import { CodigoSuscripcionRepository } from '../repositories/codigo-suscripcion.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import {
  ActivarCodigoDto,
  ActivarCodigoResponse,
} from '../models/suscripcion.model';

export class SuscripcionService {
  private suscripcionRepository: SuscripcionRepository;
  private codigoRepository: CodigoSuscripcionRepository;
  private negocioRepository: NegocioRepository;

  constructor(private prisma: PrismaClient) {
    this.suscripcionRepository = new SuscripcionRepository(this.prisma);
    this.codigoRepository = new CodigoSuscripcionRepository(this.prisma);
    this.negocioRepository = new NegocioRepository(this.prisma);
  }

  /**
   * Activar código de suscripción
   */
  async activarCodigo(
    usuarioId: string,
    dto: ActivarCodigoDto
  ): Promise<ActivarCodigoResponse> {
    // 1. Buscar el código
    const codigo = await this.codigoRepository.findByCodigo(dto.codigo);

    if (!codigo) {
      throw new Error('Código no encontrado');
    }

    // 2. Validar que el código esté disponible
    if (codigo.usado && codigo.vecesUsado >= codigo.usoMaximo) {
      throw new Error('Este código ya fue utilizado');
    }

    // 3. Validar que el código no haya expirado
    if (codigo.fechaExpiracion && new Date(codigo.fechaExpiracion) < new Date()) {
      throw new Error('Este código ha expirado');
    }

    // 4. Buscar el negocio del usuario
    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);

    if (!negocio) {
      throw new Error('Negocio no encontrado para este usuario');
    }

    // 5. Verificar si ya tiene suscripción activa
    const suscripcionActiva = await this.suscripcionRepository.findActivaByNegocio(
      negocio.id
    );

    if (suscripcionActiva) {
      throw new Error('Ya tienes una suscripción activa. No puedes activar otro código.');
    }

    // 6. Calcular fecha de vencimiento
    const fechaActivacion = new Date();
    let fechaVencimiento: Date;

    if (codigo.plan === PlanSuscripcion.PRUEBA) {
      // Prueba: 7 días
      fechaVencimiento = new Date(fechaActivacion);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);
    } else {
      // Otros planes: sumar meses
      fechaVencimiento = new Date(fechaActivacion);
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + codigo.duracionMeses);
    }

    // 7. Usar transacción para garantizar consistencia
    const resultado = await this.prisma.$transaction(async (tx) => {
      // Verificar si ya existe una suscripción para este negocio
      const suscripcionExistente = await tx.suscripcion.findUnique({
        where: { negocioId: negocio.id },
      });

      let suscripcion;

      if (suscripcionExistente) {
        // Si existe, actualizar (renovar)
        suscripcion = await tx.suscripcion.update({
          where: { negocioId: negocio.id },
          data: {
            codigoId: codigo.id,
            fechaActivacion,
            fechaVencimiento,
            activa: true,
          },
          include: {
            codigoSuscripcion: true,
          },
        });

        // Crear registro en historial
        await tx.historialSuscripcion.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'RENOVACION',
            descripcion: `Suscripción renovada con código ${codigo.codigo}`,
          },
        });
      } else {
        // Si no existe, crear nueva
        suscripcion = await tx.suscripcion.create({
          data: {
            negocioId: negocio.id,
            codigoId: codigo.id,
            fechaActivacion,
            fechaVencimiento,
            activa: true,
          },
          include: {
            codigoSuscripcion: true,
          },
        });

        // Crear registro en historial
        await tx.historialSuscripcion.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'ACTIVACION_CODIGO',
            descripcion: `Suscripción activada con código ${codigo.codigo}`,
          },
        });
      }

      // Actualizar el código (incrementar uso)
      await tx.codigoSuscripcion.update({
        where: { id: codigo.id },
        data: {
          vecesUsado: { increment: 1 },
          usado: true,
          fechaUso: new Date(),
        },
      });

      // Actualizar estado del negocio
      await tx.negocio.update({
        where: { id: negocio.id },
        data: {
          estadoSuscripcion: EstadoSuscripcion.ACTIVA,
          codigoAplicado: true,
        },
      });

      // Actualizar primerLogin del usuario
      await tx.usuario.update({
        where: { id: usuarioId },
        data: {
          primerLogin: false,
        },
      });

      // Crear registro en historial
      await tx.historialSuscripcion.create({
        data: {
          suscripcionId: suscripcion.id,
          accion: 'ACTIVACION_CODIGO',
          descripcion: `Código ${codigo.codigo} activado. Plan: ${codigo.plan}`,
          codigoUsado: codigo.codigo,
          realizadoPor: usuarioId,
        },
      });

      return suscripcion;
    });

    // 8. Obtener negocio actualizado
    const negocioActualizado = await this.negocioRepository.findById(negocio.id);

    return {
      success: true,
      data: {
        suscripcion: {
          id: resultado.id,
          fechaActivacion: resultado.fechaActivacion,
          fechaVencimiento: resultado.fechaVencimiento,
          plan: resultado.codigoSuscripcion.plan,
        },
        negocio: {
          estadoSuscripcion: negocioActualizado!.estadoSuscripcion,
          fechaVencimiento: negocioActualizado!.fechaVencimiento!,
        },
      },
      message: `¡Código activado exitosamente! Tu suscripción ${codigo.plan} estará activa hasta el ${fechaVencimiento.toLocaleDateString()}`,
    };
  }

  /**
   * Obtener suscripción activa del usuario
   */
  async obtenerSuscripcionActual(usuarioId: string) {
    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    const suscripcion = await this.suscripcionRepository.findActivaByNegocio(
      negocio.id
    );

    if (!suscripcion) {
      return {
        success: false,
        message: 'No tienes una suscripción activa',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: suscripcion.id,
        plan: suscripcion.codigoSuscripcion.plan,
        fechaActivacion: suscripcion.fechaActivacion,
        fechaVencimiento: suscripcion.fechaVencimiento,
        activa: suscripcion.activa,
        diasRestantes: Math.ceil(
          (new Date(suscripcion.fechaVencimiento).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      },
    };
  }
}
