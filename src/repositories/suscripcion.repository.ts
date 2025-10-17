// src/repositories/suscripcion.repository.ts

import { PrismaClient } from '@prisma/client';

export class SuscripcionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crear una suscripción
   */
  async create(data: {
    negocioId: string;
    codigoId: string;
    fechaVencimiento: Date;
  }) {
    return await this.prisma.suscripcion.create({
      data: {
        negocioId: data.negocioId,
        codigoId: data.codigoId,
        fechaVencimiento: data.fechaVencimiento,
        activa: true,
      },
      include: {
        codigoSuscripcion: true,
        negocio: true,
      },
    });
  }

  /**
   * Buscar suscripción activa por negocio
   */
  async findActivaByNegocio(negocioId: string) {
    return await this.prisma.suscripcion.findFirst({
      where: {
        negocioId,
        activa: true,
      },
      include: {
        codigoSuscripcion: true,
      },
    });
  }

  /**
   * Desactivar suscripciones anteriores del negocio
   */
  async desactivarAnteriores(negocioId: string) {
    return await this.prisma.suscripcion.updateMany({
      where: {
        negocioId,
        activa: true,
      },
      data: {
        activa: false,
      },
    });
  }
}
