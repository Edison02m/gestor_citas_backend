// src/repositories/sucursal.repository.ts

import { PrismaClient } from '@prisma/client';
import { SucursalDto, SucursalUpdateDto } from '../models/sucursal.model';

export class SucursalRepository {
  constructor(private prisma: PrismaClient) {}

  async findByNegocioId(negocioId: string) {
    return await this.prisma.sucursal.findMany({
      where: { negocioId },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findById(id: string) {
    return await this.prisma.sucursal.findUnique({
      where: { id },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' }
        }
      }
    });
  }

  async existsByNombre(nombre: string, negocioId: string, excludeId?: string) {
    return await this.prisma.sucursal.findFirst({
      where: {
        negocioId,
        nombre,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true }
    });
  }

  async create(negocioId: string, data: SucursalDto) {
    return await this.prisma.sucursal.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion,
        ciudad: data.ciudad,
        provincia: data.provincia,
        telefono: data.telefono,
        email: data.email,
        googleMapsUrl: data.googleMapsUrl,
        negocioId,
        horarios: {
          createMany: {
            data: data.horarios.map(h => ({
              diaSemana: h.diaSemana,
              abierto: h.abierto,
              horaApertura: h.abierto ? h.horaApertura : null,
              horaCierre: h.abierto ? h.horaCierre : null,
              tieneDescanso: h.abierto && h.tieneDescanso ? h.tieneDescanso : false,
              descansoInicio: h.abierto && h.tieneDescanso ? h.descansoInicio : null,
              descansoFin: h.abierto && h.tieneDescanso ? h.descansoFin : null,
            }))
          }
        }
      },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' }
        }
      }
    });
  }

  async update(id: string, data: SucursalUpdateDto) {
    return await this.prisma.sucursal.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.direccion !== undefined && { direccion: data.direccion }),
        ...(data.ciudad !== undefined && { ciudad: data.ciudad }),
        ...(data.provincia !== undefined && { provincia: data.provincia }),
        ...(data.telefono !== undefined && { telefono: data.telefono }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.googleMapsUrl !== undefined && { googleMapsUrl: data.googleMapsUrl }),
        ...(data.estado !== undefined && { estado: data.estado as any }),
      },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' }
        }
      }
    });
  }

  async updateHorarios(sucursalId: string, horarios: any[]) {
    // Eliminar horarios existentes
    await this.prisma.horarioSucursal.deleteMany({
      where: { sucursalId }
    });

    // Crear nuevos horarios
    await this.prisma.horarioSucursal.createMany({
      data: horarios.map(h => ({
        sucursalId,
        diaSemana: h.diaSemana,
        abierto: h.abierto,
        horaApertura: h.abierto ? h.horaApertura : null,
        horaCierre: h.abierto ? h.horaCierre : null,
        tieneDescanso: h.abierto && h.tieneDescanso ? h.tieneDescanso : false,
        descansoInicio: h.abierto && h.tieneDescanso ? h.descansoInicio : null,
        descansoFin: h.abierto && h.tieneDescanso ? h.descansoFin : null,
      }))
    });

    return await this.findById(sucursalId);
  }

  async delete(id: string) {
    return await this.prisma.sucursal.delete({
      where: { id }
    });
  }

  async countEmpleados(sucursalId: string) {
    return await this.prisma.empleadoSucursal.count({
      where: { sucursalId }
    });
  }

  async countServicios(sucursalId: string) {
    return await this.prisma.servicioSucursal.count({
      where: { sucursalId }
    });
  }

  async countCitas(sucursalId: string) {
    return await this.prisma.cita.count({
      where: { sucursalId }
    });
  }
}
