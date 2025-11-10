// src/repositories/servicio.repository.ts

import { PrismaClient } from '@prisma/client';
import { ServicioDto, ServicioUpdateDto } from '../models/servicio.model';

export class ServicioRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtener todos los servicios de un negocio
   */
  async findByNegocioId(negocioId: string) {
    return await this.prisma.servicio.findMany({
      where: { negocioId },
      include: {
        sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                nombre: true,
                direccion: true,
                ciudad: true,
                estado: true
              }
            }
          },
          orderBy: { asignadoEn: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Obtener un servicio por ID
   */
  async findById(id: string) {
    return await this.prisma.servicio.findUnique({
      where: { id },
      include: {
        sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                nombre: true,
                direccion: true,
                ciudad: true,
                estado: true
              }
            }
          },
          orderBy: { asignadoEn: 'asc' }
        }
      }
    });
  }

  /**
   * Verificar si existe un servicio con el mismo nombre
   */
  async existsByNombre(nombre: string, negocioId: string, excludeId?: string) {
    return await this.prisma.servicio.findFirst({
      where: {
        negocioId,
        nombre,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true }
    });
  }

  /**
   * Crear un nuevo servicio
   */
  async create(negocioId: string, data: ServicioDto) {
    return await this.prisma.servicio.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        duracion: data.duracion,
        precio: data.precio,
        foto: data.foto,
        color: data.color || '#3b82f6',
        negocioId,
        sucursales: data.sucursales && data.sucursales.length > 0 ? {
          createMany: {
            data: data.sucursales.map(sucursalId => ({
              sucursalId,
              disponible: true
            }))
          }
        } : undefined
      },
      include: {
        sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                nombre: true,
                direccion: true,
                ciudad: true,
                estado: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Actualizar un servicio
   */
  async update(id: string, data: ServicioUpdateDto) {
    return await this.prisma.servicio.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        ...(data.duracion !== undefined && { duracion: data.duracion }),
        ...(data.precio !== undefined && { precio: data.precio }),
        ...(data.foto !== undefined && { foto: data.foto }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.estado !== undefined && { estado: data.estado as any }),
      },
      include: {
        sucursales: {
          include: {
            sucursal: {
              select: {
                id: true,
                nombre: true,
                direccion: true,
                ciudad: true,
                estado: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Eliminar un servicio
   */
  async delete(id: string) {
    return await this.prisma.servicio.delete({
      where: { id }
    });
  }

  /**
   * Contar citas asociadas al servicio
   */
  async countCitas(servicioId: string) {
    return await this.prisma.cita.count({
      where: { servicioId }
    });
  }

  /**
   * Verificar si las sucursales pertenecen al negocio
   */
  async validateSucursales(sucursalIds: string[], negocioId: string): Promise<boolean> {
    const count = await this.prisma.sucursal.count({
      where: {
        id: { in: sucursalIds },
        negocioId
      }
    });
    return count === sucursalIds.length;
  }

  /**
   * Asignar sucursales a un servicio
   */
  async asignarSucursales(servicioId: string, sucursalIds: string[]) {
    // Eliminar asignaciones existentes
    await this.prisma.servicioSucursal.deleteMany({
      where: { servicioId }
    });

    // Crear nuevas asignaciones
    if (sucursalIds.length > 0) {
      await this.prisma.servicioSucursal.createMany({
        data: sucursalIds.map(sucursalId => ({
          servicioId,
          sucursalId,
          disponible: true
        }))
      });
    }

    return await this.findById(servicioId);
  }

  /**
   * Actualizar disponibilidad de un servicio en una sucursal
   */
  async updateDisponibilidadSucursal(servicioId: string, sucursalId: string, disponible: boolean) {
    return await this.prisma.servicioSucursal.update({
      where: {
        servicioId_sucursalId: {
          servicioId,
          sucursalId
        }
      },
      data: { disponible }
    });
  }

  /**
   * Obtener servicios disponibles en una sucursal
   */
  async findBySucursalId(sucursalId: string, negocioId: string) {
    return await this.prisma.servicio.findMany({
      where: {
        negocioId,
        sucursales: {
          some: {
            sucursalId,
            disponible: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
  }
}
