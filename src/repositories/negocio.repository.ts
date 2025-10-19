// src/repositories/negocio.repository.ts

import { PrismaClient, EstadoSuscripcion } from '@prisma/client';

export class NegocioRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crear un negocio
   */
  async create(data: {
    nombre: string;
    telefono: string;
    usuarioId: string;
    descripcion?: string;
    logo?: string;
  }) {
    return await this.prisma.negocio.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        usuarioId: data.usuarioId,
        descripcion: data.descripcion,
        logo: data.logo,
        estadoSuscripcion: EstadoSuscripcion.SIN_SUSCRIPCION,
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Buscar negocio por ID
   */
  async findById(id: string) {
    return await this.prisma.negocio.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
          },
        },
        suscripcion: true,
      },
    });
  }

  /**
   * Buscar negocio por usuario
   */
  async findByUsuarioId(usuarioId: string) {
    return await this.prisma.negocio.findUnique({
      where: { usuarioId },
      include: {
        suscripcion: true,
      },
    });
  }

  /**
   * Actualizar negocio
   */
  async update(
    id: string,
    data: {
      nombre?: string;
      telefono?: string;
      descripcion?: string;
      logo?: string;
    }
  ) {
    return await this.prisma.negocio.update({
      where: { id },
      data,
    });
  }
}
