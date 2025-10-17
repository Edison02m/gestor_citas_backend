// src/repositories/usuario.repository.ts

import { PrismaClient, RolUsuario } from '@prisma/client';

export class UsuarioRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crear un usuario
   */
  async create(data: {
    email: string;
    password: string;
    rol?: RolUsuario;
  }) {
    return await this.prisma.usuario.create({
      data: {
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
          select: {
            id: true,
            nombre: true,
            telefono: true,
            logo: true,
            descripcion: true,
            estadoSuscripcion: true,
            fechaVencimiento: true,
            codigoAplicado: true,
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
            fechaVencimiento: true,
            codigoAplicado: true,
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
            fechaVencimiento: true,
            codigoAplicado: true,
          },
        },
      },
    });
  }

  /**
   * Eliminar usuario
   */
  async delete(id: string) {
    return await this.prisma.usuario.delete({
      where: { id },
    });
  }

  /**
   * Listar todos los usuarios
   */
  async findAll(filters?: {
    rol?: RolUsuario;
    activo?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.rol) {
      where.rol = filters.rol;
    }

    if (filters?.activo !== undefined) {
      where.activo = filters.activo;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.usuario.findMany({
      where,
      include: {
        negocio: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            estadoSuscripcion: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Contar usuarios
   */
  async count(filters?: { rol?: RolUsuario; activo?: boolean }) {
    return await this.prisma.usuario.count({
      where: {
        rol: filters?.rol,
        activo: filters?.activo,
      },
    });
  }
}
