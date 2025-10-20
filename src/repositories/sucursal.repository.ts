// src/repositories/sucursal.repository.ts

import { PrismaClient } from '@prisma/client';

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

  async create(data: any) {
    return await this.prisma.sucursal.create({
      data,
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' }
        }
      }
    });
  }

  async update(id: string, data: any) {
    return await this.prisma.sucursal.update({
      where: { id },
      data,
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' }
        }
      }
    });
  }

  async delete(id: string) {
    return await this.prisma.sucursal.delete({
      where: { id }
    });
  }
}
