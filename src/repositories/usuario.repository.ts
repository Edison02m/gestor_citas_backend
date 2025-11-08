// src/repositories/usuario.repository.ts

import { PrismaClient, RolUsuario } from '@prisma/client';

export class UsuarioRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crear un usuario
   */
  async create(data: {
    nombre: string;
    email: string;
    password: string;
    rol?: RolUsuario;
  }) {
    return await this.prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        password: data.password,
        rol: data.rol || RolUsuario.ADMIN_NEGOCIO,
      },
      include: {
        negocio: true,
      },
    });
  }

  /**
   * Buscar usuario por ID
   */
  async findById(id: string) {
    return await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        negocio: {
          include: {
            suscripcion: {
              select: {
                planPendiente: true,
                fechaInicioPendiente: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Buscar usuario por email
   */
  async findByEmail(email: string) {
    return await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        negocio: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            logo: true,
            descripcion: true,
            estadoSuscripcion: true,
            codigoAplicado: true,
            reportesAvanzados: true,
          },
        },
      },
    });
  }

  /**
   * Verificar si un email ya existe
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.usuario.count({
      where: { email },
    });
    return count > 0;
  }

  /**
   * Actualizar usuario
   */
  async update(
    id: string,
    data: {
      nombre?: string;
      email?: string;
      password?: string;
      activo?: boolean;
      primerLogin?: boolean;
    }
  ) {
    return await this.prisma.usuario.update({
      where: { id },
      data,
      include: {
        negocio: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            estadoSuscripcion: true,
            codigoAplicado: true,
          },
        },
      },
    });
  }
}
