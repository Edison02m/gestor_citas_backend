import { PrismaClient, EstadoSuscripcion, PlanSuscripcion } from '@prisma/client';
import { CodigoSuscripcionRepository } from '../repositories/codigo-suscripcion.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import { SuscripcionRepository } from '../repositories/suscripcion.repository';
import {
  ActivarCodigoDto,
  ActivarCodigoResponse,
} from '../models/suscripcion.model';

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

    const fechaActivacion = new Date();
    let fechaVencimiento: Date;

    if (codigo.plan === PlanSuscripcion.PRUEBA) {
      fechaVencimiento = new Date(fechaActivacion);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);
    } else {
      fechaVencimiento = new Date(fechaActivacion);
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + codigo.duracionMeses);
    }

    const resultado = await this.prisma.$transaction(async (tx) => {
      const suscripcionExistente = await this.suscripcionRepository.findByNegocioId(
        negocio.id,
        tx
      );

      let suscripcion;

      if (suscripcionExistente) {
        suscripcion = await this.suscripcionRepository.update(
          negocio.id,
          {
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
            accion: 'RENOVACION',
            descripcion: `Suscripción renovada con código ${codigo.codigo}. Plan: ${codigo.plan}`,
            codigoUsado: codigo.codigo,
            realizadoPor: usuarioId,
          },
        });
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

      await tx.codigoSuscripcion.update({
        where: { id: codigo.id },
        data: {
          vecesUsado: { increment: 1 },
          usado: true,
          fechaUso: new Date(),
        },
      });

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

      return suscripcion;
    });

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
        },
      },
      message: `¡Código activado exitosamente! Tu suscripción ${codigo.plan} estará activa hasta el ${fechaVencimiento.toLocaleDateString()}`,
    };
  }
}
