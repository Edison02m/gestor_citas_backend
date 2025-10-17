// src/repositories/codigo-suscripcion.repository.ts

import { PrismaClient, PlanSuscripcion } from '@prisma/client';
import { CodigoSuscripcionFilters } from '../models/codigo-suscripcion.model';

export class CodigoSuscripcionRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crear un código de suscripción
   */
  async create(data: {
    codigo: string;
    plan: PlanSuscripcion;
    duracionMeses: number;
    descripcion?: string;
    precio?: number;
    fechaExpiracion?: Date;
    usoMaximo: number;
    motivoCreacion?: string;
    notas?: string;
  }) {
    return await this.prisma.codigoSuscripcion.create({
      data: {
        codigo: data.codigo,
        plan: data.plan,
        duracionMeses: data.duracionMeses,
        descripcion: data.descripcion,
        precio: data.precio,
        fechaExpiracion: data.fechaExpiracion,
        usoMaximo: data.usoMaximo,
        motivoCreacion: data.motivoCreacion,
        notas: data.notas,
      },
    });
  }

  /**
   * Buscar código por ID
   */
  async findById(id: string) {
    return await this.prisma.codigoSuscripcion.findUnique({
      where: { id },
      include: {
        suscripciones: {
          include: {
            negocio: {
              select: {
                id: true,
                nombre: true,
                telefono: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Buscar código por código de texto
   */
  async findByCodigo(codigo: string) {
    return await this.prisma.codigoSuscripcion.findUnique({
      where: { codigo },
      include: {
        suscripciones: {
          include: {
            negocio: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Listar todos los códigos con filtros y paginación
   */
  async findAll(
    filters: CodigoSuscripcionFilters = {},
    page: number = 1,
    limit: number = 20
  ) {
    const where: any = {};

    // Filtro por plan
    if (filters.plan) {
      where.plan = filters.plan;
    }

    // Filtro por usado/no usado
    if (filters.usado !== undefined) {
      where.usado = filters.usado;
    }

    // Filtro por expirado
    if (filters.expirado) {
      where.fechaExpiracion = {
        lt: new Date(),
      };
    }

    // Filtro por disponible (no usado y no expirado)
    if (filters.disponible) {
      where.usado = false;
      where.OR = [
        { fechaExpiracion: null },
        { fechaExpiracion: { gte: new Date() } },
      ];
    }

    // Búsqueda por texto
    if (filters.search) {
      where.OR = [
        { codigo: { contains: filters.search, mode: 'insensitive' } },
        { descripcion: { contains: filters.search, mode: 'insensitive' } },
        { notas: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [codigos, total] = await Promise.all([
      this.prisma.codigoSuscripcion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          suscripciones: {
            select: {
              id: true,
              fechaActivacion: true,
              negocio: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.codigoSuscripcion.count({ where }),
    ]);

    return { codigos, total };
  }

  /**
   * Actualizar un código
   */
  async update(
    id: string,
    data: {
      descripcion?: string;
      precio?: number;
      fechaExpiracion?: Date;
      usoMaximo?: number;
      notas?: string;
    }
  ) {
    return await this.prisma.codigoSuscripcion.update({
      where: { id },
      data: {
        ...data,
        precio: data.precio !== undefined ? data.precio : undefined,
      },
    });
  }

  /**
   * Eliminar un código (solo si no ha sido usado)
   */
  async delete(id: string) {
    return await this.prisma.codigoSuscripcion.delete({
      where: { id },
    });
  }

  /**
   * Marcar código como usado
   */
  async marcarComoUsado(id: string) {
    return await this.prisma.codigoSuscripcion.update({
      where: { id },
      data: {
        usado: true,
        fechaUso: new Date(),
        vecesUsado: { increment: 1 },
      },
    });
  }

  /**
   * Verificar si un código existe
   */
  async codigoExists(codigo: string): Promise<boolean> {
    const count = await this.prisma.codigoSuscripcion.count({
      where: { codigo },
    });
    return count > 0;
  }

  /**
   * Obtener estadísticas de códigos
   */
  async getEstadisticas() {
    const [total, usados, expirados] = await Promise.all([
      this.prisma.codigoSuscripcion.count(),
      this.prisma.codigoSuscripcion.count({ where: { usado: true } }),
      this.prisma.codigoSuscripcion.count({
        where: {
          fechaExpiracion: {
            lt: new Date(),
          },
        },
      }),
    ]);

    // Estadísticas por plan
    const porPlan = await this.prisma.codigoSuscripcion.groupBy({
      by: ['plan'],
      _count: true,
      _sum: {
        vecesUsado: true,
      },
    });

    return {
      total,
      usados,
      disponibles: total - usados - expirados,
      expirados,
      porPlan,
    };
  }

  /**
   * Obtener códigos próximos a vencer
   */
  async findProximosAVencer(dias: number = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    return await this.prisma.codigoSuscripcion.findMany({
      where: {
        usado: false,
        fechaExpiracion: {
          gte: new Date(),
          lte: fechaLimite,
        },
      },
      orderBy: {
        fechaExpiracion: 'asc',
      },
    });
  }

  /**
   * Contar códigos disponibles por plan
   */
  async countDisponiblesPorPlan(plan: PlanSuscripcion) {
    return await this.prisma.codigoSuscripcion.count({
      where: {
        plan,
        usado: false,
        OR: [
          { fechaExpiracion: null },
          { fechaExpiracion: { gte: new Date() } },
        ],
      },
    });
  }
}
