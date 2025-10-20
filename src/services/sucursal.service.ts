// src/services/sucursal.service.ts

import { PrismaClient } from '@prisma/client';
import { SucursalRepository } from '../repositories/sucursal.repository';
import { SucursalResponse } from '../models/sucursal.model';

export class SucursalService {
  private sucursalRepository: SucursalRepository;

  constructor(private prisma: PrismaClient) {
    this.sucursalRepository = new SucursalRepository(this.prisma);
  }

  async obtenerSucursales(negocioId: string): Promise<SucursalResponse[]> {
    const sucursales = await this.sucursalRepository.findByNegocioId(negocioId);
    return sucursales.map(this.toResponse);
  }

  async obtenerSucursalPorId(id: string, negocioId: string): Promise<SucursalResponse> {
    const sucursal = await this.sucursalRepository.findById(id);

    if (!sucursal) {
      throw new Error('Sucursal no encontrada');
    }

    // Verificar que la sucursal pertenece al negocio
    if (sucursal.negocioId !== negocioId) {
      throw new Error('No tienes permisos para acceder a esta sucursal');
    }

    return this.toResponse(sucursal);
  }

  private toResponse(sucursal: any): SucursalResponse {
    return {
      id: sucursal.id,
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      ciudad: sucursal.ciudad,
      provincia: sucursal.provincia,
      telefono: sucursal.telefono,
      email: sucursal.email,
      estado: sucursal.estado,
      negocioId: sucursal.negocioId,
      createdAt: sucursal.createdAt,
      updatedAt: sucursal.updatedAt,
      horarios: sucursal.horarios?.map((h: any) => ({
        id: h.id,
        diaSemana: h.diaSemana,
        abierto: h.abierto,
        horaApertura: h.horaApertura,
        horaCierre: h.horaCierre
      }))
    };
  }
}
