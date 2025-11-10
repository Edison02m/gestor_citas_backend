// src/repositories/cita.repository.ts

import { PrismaClient, Prisma, EstadoCita } from '@prisma/client';
import { FiltrosCitasDto } from '../models/cita.model';

export class CitaRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crear una nueva cita
   */
  async create(data: Prisma.CitaCreateInput) {
    return await this.prisma.cita.create({
      data,
      include: {
        cliente: true,
        servicio: true,
        empleado: true,
        sucursal: true,
      },
    });
  }

  /**
   * Obtener cita por ID con todas sus relaciones
   */
  async findById(id: string) {
    return await this.prisma.cita.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
            cedula: true,
          },
        },
        servicio: {
          select: {
            id: true,
            nombre: true,
            duracion: true,
            precio: true,
            color: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            cargo: true,
            foto: true,
          },
        },
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
   * Listar citas con filtros y paginación
   */
  async findMany(negocioId: string, filtros: FiltrosCitasDto) {
    const {
      fechaInicio,
      fechaFin,
      clienteId,
      empleadoId,
      sucursalId,
      servicioId,
      estado,
      canalOrigen,
      page = 1,
      limit = 50,
    } = filtros;

    const where: Prisma.CitaWhereInput = {
      negocioId,
      ...(fechaInicio && fechaFin && {
        fecha: {
          gte: this.parseDate(fechaInicio),
          lte: this.parseDate(fechaFin),
        },
      }),
      ...(clienteId && { clienteId }),
      ...(empleadoId && { empleadoId }),
      ...(sucursalId && { sucursalId }),
      ...(servicioId && { servicioId }),
      ...(estado && { estado }),
      ...(canalOrigen && { canalOrigen }),
    };

    const [citas, total] = await Promise.all([
      this.prisma.cita.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
              email: true,
              cedula: true,
            },
          },
          servicio: {
            select: {
              id: true,
              nombre: true,
              duracion: true,
              precio: true,
              color: true,
            },
          },
          empleado: {
            select: {
              id: true,
              nombre: true,
              cargo: true,
              foto: true,
            },
          },
          sucursal: {
            select: {
              id: true,
              nombre: true,
              direccion: true,
              telefono: true,
            },
          },
        },
        orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cita.count({ where }),
    ]);

    return {
      citas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener citas de un día específico
   */
  async findByDate(negocioId: string, fecha: Date, sucursalId?: string) {
    const where: Prisma.CitaWhereInput = {
      negocioId,
      fecha,
      ...(sucursalId && { sucursalId }),
    };

    return await this.prisma.cita.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
            email: true,
          },
        },
        servicio: {
          select: {
            id: true,
            nombre: true,
            duracion: true,
            color: true,
          },
        },
        empleado: {
          select: {
            id: true,
            nombre: true,
            foto: true,
          },
        },
        sucursal: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { horaInicio: 'asc' },
    });
  }

  /**
   * Verificar conflictos de horario para un empleado o sucursal
   * Detecta todos los tipos de solapamiento:
   * 1. Nueva cita empieza durante una cita existente
   * 2. Nueva cita termina durante una cita existente  
   * 3. Nueva cita envuelve completamente una cita existente
   */
  async checkConflicto(
    empleadoId: string | null,
    sucursalId: string | null,
    fecha: Date,
    horaInicio: string,
    horaFin: string,
    excludeCitaId?: string
  ): Promise<boolean> {
    const conflicto = await this.prisma.cita.findFirst({
      where: {
        ...(empleadoId && { empleadoId }),
        ...(sucursalId && !empleadoId && { sucursalId }),
        fecha,
        id: excludeCitaId ? { not: excludeCitaId } : undefined,
        estado: {
          notIn: ['CANCELADA'],
        },
        OR: [
          // Caso 1: Nueva cita empieza durante una existente
          // Existente: 09:00-10:00, Nueva: 09:30-11:00
          {
            horaInicio: { lte: horaInicio },
            horaFin: { gt: horaInicio },
          },
          // Caso 2: Nueva cita termina durante una existente
          // Existente: 10:00-11:00, Nueva: 09:00-10:30
          {
            horaInicio: { lt: horaFin },
            horaFin: { gte: horaFin },
          },
          // Caso 3: Nueva cita envuelve completamente una existente
          // Existente: 10:00-11:00, Nueva: 09:00-12:00
          {
            horaInicio: { gte: horaInicio },
            horaFin: { lte: horaFin },
          },
        ],
      },
    });

    return !!conflicto;
  }

  /**
   * Actualizar una cita
   */
  async update(id: string, data: Prisma.CitaUpdateInput) {
    return await this.prisma.cita.update({
      where: { id },
      data,
      include: {
        cliente: true,
        servicio: true,
        empleado: true,
        sucursal: true,
      },
    });
  }

  /**
   * Cambiar estado de una cita
   */
  async updateEstado(id: string, estado: EstadoCita, modificadoPor?: string) {
    return await this.prisma.cita.update({
      where: { id },
      data: {
        estado,
        modificadoPor,
      },
    });
  }

  /**
   * Eliminar una cita
   */
  async delete(id: string) {
    return await this.prisma.cita.delete({
      where: { id },
    });
  }

  /**
   * Obtener estadísticas de citas
   */
  async getEstadisticas(negocioId: string, fechaInicio?: Date, fechaFin?: Date) {
    const where: Prisma.CitaWhereInput = {
      negocioId,
      ...(fechaInicio &&
        fechaFin && {
          fecha: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        }),
    };

    const [
      totalCitas,
      citasPendientes,
      citasConfirmadas,
      citasCompletadas,
      citasCanceladas,
      citasNoAsistio,
      ingresoData,
    ] = await Promise.all([
      this.prisma.cita.count({ where }),
      this.prisma.cita.count({ where: { ...where, estado: 'PENDIENTE' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'CONFIRMADA' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'COMPLETADA' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'CANCELADA' } }),
      this.prisma.cita.count({ where: { ...where, estado: 'NO_ASISTIO' } }),
      this.prisma.cita.aggregate({
        where: { ...where, estado: 'COMPLETADA' },
        _sum: { precioTotal: true },
      }),
    ]);

    return {
      totalCitas,
      citasPendientes,
      citasConfirmadas,
      citasCompletadas,
      citasCanceladas,
      citasNoAsistio,
      ingresoTotal: Number(ingresoData._sum.precioTotal || 0),
    };
  }

  /**
   * Obtener próximas citas de un cliente
   */
  async getProximasCitasCliente(clienteId: string, limit: number = 5) {
    // Usar parseDate con fecha de hoy en formato YYYY-MM-DD
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const fechaHoyParsed = this.parseDate(fechaHoy);

    return await this.prisma.cita.findMany({
      where: {
        clienteId,
        fecha: { gte: fechaHoyParsed },
        estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
      },
      include: {
        servicio: {
          select: {
            nombre: true,
            duracion: true,
            color: true,
          },
        },
        empleado: {
          select: {
            nombre: true,
            foto: true,
          },
        },
        sucursal: {
          select: {
            nombre: true,
            direccion: true,
          },
        },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      take: limit,
    });
  }

  /**
   * Obtener historial de citas de un cliente
   */
  async getHistorialCliente(clienteId: string, limit: number = 10) {
    return await this.prisma.cita.findMany({
      where: {
        clienteId,
        estado: { in: ['COMPLETADA', 'CANCELADA', 'NO_ASISTIO'] },
      },
      include: {
        servicio: {
          select: {
            nombre: true,
            precio: true,
            color: true,
          },
        },
        empleado: {
          select: {
            nombre: true,
          },
        },
        sucursal: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
      take: limit,
    });
  }

  /**
   * Parsear fecha en formato "YYYY-MM-DD" a Date en zona horaria local
   * Evita conversión UTC que puede cambiar el día
   */
  private parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
}
