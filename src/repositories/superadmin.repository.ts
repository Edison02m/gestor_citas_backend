import prisma from '../database/prisma';
import { SuperAdmin, Prisma } from '@prisma/client';

export class SuperAdminRepository {
  async findById(id: string): Promise<SuperAdmin | null> {
    return await prisma.superAdmin.findUnique({
      where: { id }
    });
  }

  async findByEmail(email: string): Promise<SuperAdmin | null> {
    return await prisma.superAdmin.findUnique({
      where: { email }
    });
  }

  async create(data: Prisma.SuperAdminCreateInput): Promise<SuperAdmin> {
    return await prisma.superAdmin.create({
      data
    });
  }

  async emailExists(email: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.superAdmin.findFirst({
      where: {
        email,
        ...(excludeId && { id: { not: excludeId } })
      }
    });
    return !!existing;
  }
}
