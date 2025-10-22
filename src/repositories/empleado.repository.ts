// src/repositories/empleado.repository.ts

import { PrismaClient } from '@prisma/client';
import {
  EmpleadoDto,
  EmpleadoUpdateDto,
  HorarioEmpleadoDto,
  BloqueoEmpleadoDto,
} from '../models/empleado.model';

export class EmpleadoRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtener todos los empleados de un negocio con paginación
   */
  async findAll(negocioId: string, pagina: number = 1, limite: number = 50) {
    const skip = (pagina - 1) * limite;

    const [empleados, total] = await Promise.all([
      this.prisma.empleado.findMany({
        where: { negocioId },
        include: {
          horarios: {
            orderBy: { diaSemana: 'asc' },
          },
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limite,
      }),
      this.prisma.empleado.count({ where: { negocioId } }),
    ]);

    return {
      empleados,
      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    };
  }

  /**
   * Obtener un empleado por ID con sus horarios
   */
  async findById(id: string, negocioId: string) {
    return await this.prisma.empleado.findFirst({
      where: { id, negocioId },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' },
        },
        bloqueos: {
          orderBy: { fechaInicio: 'asc' },
        },
      },
    });
  }

  /**
   * Verificar si existe un empleado con el mismo email en el negocio
   */
  async existsByEmail(email: string, negocioId: string, excludeId?: string) {
    return await this.prisma.empleado.findFirst({
      where: {
        negocioId,
        email,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
  }

  /**
   * Verificar si existe un empleado con el mismo teléfono en el negocio
   */
  async existsByTelefono(telefono: string, negocioId: string, excludeId?: string) {
    return await this.prisma.empleado.findFirst({
      where: {
        negocioId,
        telefono,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
  }

  /**
   * Crear un nuevo empleado
   */
  async create(negocioId: string, data: EmpleadoDto) {
    return await this.prisma.empleado.create({
      data: {
        nombre: data.nombre,
        cargo: data.cargo,
        telefono: data.telefono,
        email: data.email,
        foto: data.foto,
        color: data.color || '#3b82f6',
        negocioId,
      },
      include: {
        horarios: true,
      },
    });
  }

  /**
   * Actualizar un empleado
   */
  async update(id: string, data: EmpleadoUpdateDto) {
    return await this.prisma.empleado.update({
      where: { id },
      data: {
        ...(data.nombre && { nombre: data.nombre }),
        ...(data.cargo && { cargo: data.cargo }),
        ...(data.telefono && { telefono: data.telefono }),
        ...(data.email && { email: data.email }),
        ...(data.foto !== undefined && { foto: data.foto }),
        ...(data.color && { color: data.color }),
        ...(data.estado && { estado: data.estado as any }),
      },
      include: {
        horarios: {
          orderBy: { diaSemana: 'asc' },
        },
      },
    });
  }

  /**
   * Eliminar un empleado
   */
  async delete(id: string) {
    return await this.prisma.empleado.delete({
      where: { id },
    });
  }

  /**
   * Contar citas del empleado
   */
  async countCitas(empleadoId: string) {
    return await this.prisma.cita.count({
      where: { empleadoId },
    });
  }

  // ============================================================================
  // HORARIOS
  // ============================================================================

  /**
   * Obtener horarios de un empleado
   */
  async findHorarios(empleadoId: string) {
    return await this.prisma.horarioEmpleado.findMany({
      where: { empleadoId },
      orderBy: { diaSemana: 'asc' },
    });
  }

  /**
   * Crear o actualizar horarios de un empleado (reemplaza todos)
   */
  async upsertHorarios(empleadoId: string, horarios: HorarioEmpleadoDto[]) {
    // Eliminar horarios existentes
    await this.prisma.horarioEmpleado.deleteMany({
      where: { empleadoId },
    });

    // Crear nuevos horarios
    if (horarios.length > 0) {
      await this.prisma.horarioEmpleado.createMany({
        data: horarios.map((horario) => ({
          empleadoId,
          diaSemana: horario.diaSemana,
          horaInicio: horario.horaInicio,
          horaFin: horario.horaFin,
          tieneDescanso: horario.tieneDescanso || false,
          descansoInicio: horario.descansoInicio,
          descansoFin: horario.descansoFin,
        })),
      });
    }

    return await this.findHorarios(empleadoId);
  }

  /**
   * Crear un horario individual
   */
  async createHorario(empleadoId: string, horario: HorarioEmpleadoDto) {
    return await this.prisma.horarioEmpleado.create({
      data: {
        empleadoId,
        diaSemana: horario.diaSemana,
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin,
        tieneDescanso: horario.tieneDescanso || false,
        descansoInicio: horario.descansoInicio,
        descansoFin: horario.descansoFin,
      },
    });
  }

  /**
   * Actualizar un horario específico
   */
  async updateHorario(horarioId: string, horario: Partial<HorarioEmpleadoDto>) {
    return await this.prisma.horarioEmpleado.update({
      where: { id: horarioId },
      data: {
        ...(horario.horaInicio && { horaInicio: horario.horaInicio }),
        ...(horario.horaFin && { horaFin: horario.horaFin }),
        ...(horario.tieneDescanso !== undefined && { tieneDescanso: horario.tieneDescanso }),
        ...(horario.descansoInicio !== undefined && { descansoInicio: horario.descansoInicio }),
        ...(horario.descansoFin !== undefined && { descansoFin: horario.descansoFin }),
      },
    });
  }

  /**
   * Eliminar un horario específico
   */
  async deleteHorario(horarioId: string) {
    return await this.prisma.horarioEmpleado.delete({
      where: { id: horarioId },
    });
  }

  // ============================================================================
  // BLOQUEOS
  // ============================================================================

  /**
   * Obtener bloqueos de un empleado
   */
  async findBloqueos(empleadoId: string, fechaDesde?: Date) {
    return await this.prisma.bloqueoEmpleado.findMany({
      where: {
        empleadoId,
        ...(fechaDesde && { fechaFin: { gte: fechaDesde } }),
      },
      orderBy: { fechaInicio: 'asc' },
    });
  }

  /**
   * Crear un bloqueo para un empleado
   */
  async createBloqueo(empleadoId: string, bloqueo: BloqueoEmpleadoDto) {
    return await this.prisma.bloqueoEmpleado.create({
      data: {
        empleadoId,
        fechaInicio: bloqueo.fechaInicio,
        fechaFin: bloqueo.fechaFin,
        motivo: bloqueo.motivo,
        todoElDia: bloqueo.todoElDia ?? true,
        horaInicio: bloqueo.horaInicio,
        horaFin: bloqueo.horaFin,
      },
    });
  }

  /**
   * Eliminar un bloqueo
   */
  async deleteBloqueo(bloqueoId: string) {
    return await this.prisma.bloqueoEmpleado.delete({
      where: { id: bloqueoId },
    });
  }

  /**
   * Obtener un bloqueo por ID
   */
  async findBloqueoById(bloqueoId: string, empleadoId: string) {
    return await this.prisma.bloqueoEmpleado.findFirst({
      where: { id: bloqueoId, empleadoId },
    });
  }

  // ============================================================================
  // SUCURSALES
  // ============================================================================

  /**
   * Obtener sucursales asignadas a un empleado
   */
  async findSucursales(empleadoId: string) {
    return await this.prisma.empleadoSucursal.findMany({
      where: { empleadoId },
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true,
            estado: true,
          },
        },
      },
      orderBy: {
        asignadoEn: 'desc',
      },
    });
  }

  /**
   * Verificar si un empleado está asignado a una sucursal
   */
  async isAssignedToSucursal(empleadoId: string, sucursalId: string) {
    const asignacion = await this.prisma.empleadoSucursal.findUnique({
      where: {
        empleadoId_sucursalId: {
          empleadoId,
          sucursalId,
        },
      },
    });
    return !!asignacion;
  }

  /**
   * Asignar empleado a una sucursal
   */
  async assignToSucursal(empleadoId: string, sucursalId: string) {
    return await this.prisma.empleadoSucursal.create({
      data: {
        empleadoId,
        sucursalId,
      },
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true,
            direccion: true,
            telefono: true,
          },
        },
      },
    });
  }

  /**
   * Asignar empleado a múltiples sucursales
   */
  async assignToMultipleSucursales(empleadoId: string, sucursalIds: string[]) {
    await this.prisma.empleadoSucursal.createMany({
      data: sucursalIds.map((sucursalId) => ({
        empleadoId,
        sucursalId,
      })),
      skipDuplicates: true,
    });

    return await this.findSucursales(empleadoId);
  }

  /**
   * Desasignar empleado de una sucursal
   */
  async unassignFromSucursal(empleadoId: string, sucursalId: string) {
    return await this.prisma.empleadoSucursal.delete({
      where: {
        empleadoId_sucursalId: {
          empleadoId,
          sucursalId,
        },
      },
    });
  }

  /**
   * Desasignar empleado de todas las sucursales
   */
  async unassignFromAllSucursales(empleadoId: string) {
    return await this.prisma.empleadoSucursal.deleteMany({
      where: { empleadoId },
    });
  }

  /**
   * Verificar si una sucursal existe y pertenece al negocio
   */
  async verifySucursalExists(sucursalId: string, negocioId: string) {
    return await this.prisma.sucursal.findFirst({
      where: {
        id: sucursalId,
        negocioId,
      },
      select: { id: true },
    });
  }
}
