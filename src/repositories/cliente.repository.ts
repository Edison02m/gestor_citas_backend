// src/repositories/cliente.repository.ts

import { PrismaClient } from '@prisma/client';
import { ClienteDto, ClienteUpdateDto } from '../models/cliente.model';

export class ClienteRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtener todos los clientes de un negocio con paginación
   */
  async findAll(negocioId: string, pagina: number = 1, limite: number = 50) {
    const skip = (pagina - 1) * limite;

    const [clientes, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where: { negocioId },
        orderBy: { nombre: 'asc' },
        skip,
        take: limite,
      }),
      this.prisma.cliente.count({ where: { negocioId } }),
    ]);

    return {
      clientes,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  /**
   * Obtener un cliente por ID
   */
  async findById(id: string, negocioId: string) {
    return await this.prisma.cliente.findFirst({
      where: { id, negocioId },
    });
  }

  /**
   * Verificar si existe un cliente con el mismo teléfono
   */
  async existsByTelefono(telefono: string, negocioId: string, excludeId?: string) {
    return await this.prisma.cliente.findFirst({
      where: {
        negocioId,
        telefono,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
  }

  /**
   * Verificar si existe un cliente con la misma cédula en el negocio
   */
  async existsByCedula(cedula: string, negocioId: string, excludeId?: string) {
    return await this.prisma.cliente.findFirst({
      where: {
        negocioId,
        cedula,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true, nombre: true },
    });
  }

  /**
   * Crear un nuevo cliente
   */
  async create(negocioId: string, data: ClienteDto) {
    return await this.prisma.cliente.create({
      data: {
        nombre: data.nombre,
        cedula: data.cedula,
        telefono: data.telefono,
        email: data.email,
        notas: data.notas,
        negocioId,
      },
    });
  }

  /**
   * Actualizar un cliente
   */
  async update(id: string, data: ClienteUpdateDto) {
    return await this.prisma.cliente.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.cedula && { cedula: data.cedula }),
        ...(data.telefono && { telefono: data.telefono }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.notas !== undefined && { notas: data.notas }),
      },
    });
  }

  /**
   * Eliminar un cliente
   */
  async delete(id: string) {
    return await this.prisma.cliente.delete({
      where: { id },
    });
  }

  /**
   * Contar citas del cliente
   */
  async countCitas(clienteId: string) {
    return await this.prisma.cita.count({
      where: { clienteId },
    });
  }
}
