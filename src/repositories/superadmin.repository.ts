import prisma from '../database/prisma';
import { SuperAdmin, Prisma } from '@prisma/client';

export class SuperAdminRepository {
  /**
   * Obtener todos los super admins
   */
  async findAll(): Promise<SuperAdmin[]> {
    return await prisma.superAdmin.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Obtener super admins con paginación
   */
  async findPaginated(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      prisma.superAdmin.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.count()
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Buscar por ID
   */
  async findById(id: string): Promise<SuperAdmin | null> {
    return await prisma.superAdmin.findUnique({
      where: { id }
    });
  }

  /**
   * Buscar por email
   */
  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return await prisma.superAdmin.findUnique({
      where: { email }
    });
  }

  /**
   * Crear un super admin
   */
  async create(data: Prisma.SuperAdminCreateInput): Promise<SuperAdmin> {
    return await prisma.superAdmin.create({
      data
    });
  }

  /**
   * Actualizar un super admin
   */
  async update(id: string, data: Prisma.SuperAdminUpdateInput): Promise<SuperAdmin> {
    return await prisma.superAdmin.update({
      where: { id },
      data
    });
  }

  /**
   * Eliminar un super admin
   */
  async delete(id: string): Promise<SuperAdmin> {
    return await prisma.superAdmin.delete({
      where: { id }
    });
  }

  /**
   * Contar total de super admins
   */
  async count(): Promise<number> {
    return await prisma.superAdmin.count();
  }

  /**
   * Verificar si un email ya existe
   */
  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.superAdmin.findFirst({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } })
      }
    });
    return !!existing;
  }

  /**
   * Obtener solo super admins activos
   */
  async findActive(): Promise<SuperAdmin[]> {
    return await prisma.superAdmin.findMany({
      where: { activo: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
