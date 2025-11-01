// src/services/cita.service.ts

import { PrismaClient, EstadoCita } from '@prisma/client';
import { CitaRepository } from '../repositories/cita.repository';
import {
  CreateCitaDto,
  UpdateCitaDto,
  FiltrosCitasDto,
  DisponibilidadEmpleadoDto,
  HorarioDisponible,
} from '../models/cita.model';
import { emailService } from '../emails/EmailService';

export class CitaService {
  private citaRepository: CitaRepository;

  constructor(private prisma: PrismaClient) {
    this.citaRepository = new CitaRepository(prisma);
  }

  /**
   * Crear una nueva cita con validaciones
   */
  async crearCita(negocioId: string, dto: CreateCitaDto, creadoPor?: string) {
    // 1. Validar que el cliente exista y pertenezca al negocio
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, negocioId },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado o no pertenece a tu negocio');
    }

    // 2. Validar que el servicio exista y pertenezca al negocio
    const servicio = await this.prisma.servicio.findFirst({
      where: { id: dto.servicioId, negocioId, estado: 'ACTIVO' },
    });

    if (!servicio) {
      throw new Error('Servicio no encontrado o no está activo');
    }

    // 3. Validar que la sucursal exista y pertenezca al negocio
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id: dto.sucursalId, negocioId, estado: 'ACTIVA' },
    });

    if (!sucursal) {
      throw new Error('Sucursal no encontrada o no está activa');
    }

    // 4. Preparar datos de fecha/hora para validaciones
    const fecha = this.parseDate(dto.fecha);
    const horaInicio = dto.horaInicio; // Ya es string "09:00"
    const horaFin = dto.horaFin;       // Ya es string "10:00"
    const diaSemana = fecha.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado

    // 4.1. Validar que la sucursal esté abierta ese día
    const horarioSucursal = await this.prisma.horarioSucursal.findFirst({
      where: {
        sucursalId: dto.sucursalId,
        diaSemana,
        abierto: true,
      },
    });

    if (!horarioSucursal) {
      throw new Error('La sucursal está cerrada ese día de la semana');
    }

    // 4.2. Validar que la cita esté dentro del horario de la sucursal
    if (!this.estaEnHorario(horaInicio, horaFin, horarioSucursal.horaApertura!, horarioSucursal.horaCierre!)) {
      throw new Error(
        `La cita debe estar dentro del horario de la sucursal (${horarioSucursal.horaApertura} - ${horarioSucursal.horaCierre})`
      );
    }

    // 4.3. Validar que la cita no esté en el período de descanso de la sucursal
    if (horarioSucursal.tieneDescanso && horarioSucursal.descansoInicio && horarioSucursal.descansoFin) {
      if (this.hayConflictoConDescanso(horaInicio, horaFin, horarioSucursal.descansoInicio, horarioSucursal.descansoFin)) {
        throw new Error(
          `La cita no puede estar en el período de descanso de la sucursal (${horarioSucursal.descansoInicio} - ${horarioSucursal.descansoFin})`
        );
      }
    }

    // 5. Si se especifica empleado, validar que exista y esté activo
    if (dto.empleadoId) {
      const empleado = await this.prisma.empleado.findFirst({
        where: {
          id: dto.empleadoId,
          negocioId,
          estado: 'ACTIVO',
        },
        include: {
          sucursales: {
            where: { sucursalId: dto.sucursalId },
          },
        },
      });

      if (!empleado) {
        throw new Error('Empleado no encontrado o no está activo');
      }

      if (empleado.sucursales.length === 0) {
        throw new Error('El empleado no trabaja en la sucursal seleccionada');
      }

      // 5.1. Validar que el empleado trabaje ese día de la semana
      const horarioEmpleado = await this.prisma.horarioEmpleado.findFirst({
        where: {
          empleadoId: dto.empleadoId,
          diaSemana,
        },
      });

      if (!horarioEmpleado) {
        throw new Error('El empleado no trabaja ese día de la semana');
      }

      // 5.2. Validar que la cita esté dentro del horario del empleado
      if (!this.estaEnHorario(horaInicio, horaFin, horarioEmpleado.horaInicio, horarioEmpleado.horaFin)) {
        throw new Error(
          `La cita debe estar dentro del horario del empleado (${horarioEmpleado.horaInicio} - ${horarioEmpleado.horaFin})`
        );
      }

      // 5.3. Validar que la cita no esté en el período de descanso del empleado
      if (horarioEmpleado.tieneDescanso && horarioEmpleado.descansoInicio && horarioEmpleado.descansoFin) {
        if (this.hayConflictoConDescanso(horaInicio, horaFin, horarioEmpleado.descansoInicio, horarioEmpleado.descansoFin)) {
          throw new Error(
            `La cita no puede estar en el período de descanso del empleado (${horarioEmpleado.descansoInicio} - ${horarioEmpleado.descansoFin})`
          );
        }
      }

      // 5.4. Validar que no haya bloqueos del empleado en esa fecha
      const bloqueos = await this.prisma.bloqueoEmpleado.findMany({
        where: {
          empleadoId: dto.empleadoId,
          fechaInicio: { lte: fecha },
          fechaFin: { gte: fecha },
        },
      });

      if (bloqueos.length > 0) {
        // Si hay bloqueo de todo el día
        if (bloqueos.some(b => b.todoElDia)) {
          throw new Error('El empleado no está disponible ese día (día bloqueado)');
        }

        // Si hay bloqueos por horas
        const bloqueoPorHoras = bloqueos.find(b => !b.todoElDia && b.horaInicio && b.horaFin);
        if (bloqueoPorHoras) {
          if (this.hayConflictoConDescanso(horaInicio, horaFin, bloqueoPorHoras.horaInicio!, bloqueoPorHoras.horaFin!)) {
            throw new Error(
              `El empleado tiene un bloqueo en ese horario (${bloqueoPorHoras.horaInicio} - ${bloqueoPorHoras.horaFin})`
            );
          }
        }
      }

      // Verificar conflicto de horario del empleado específico
      const hayConflicto = await this.citaRepository.checkConflicto(
        dto.empleadoId,
        null, // No verificar sucursal, solo empleado
        fecha,
        horaInicio,
        horaFin
      );

      if (hayConflicto) {
        throw new Error('El empleado ya tiene una cita en ese horario');
      }
    } else {
      // 6. Si NO se especifica empleado, validar capacidad de la sucursal
      const tieneCapacidad = await this.validarCapacidadSucursal(
        dto.sucursalId,
        fecha,
        horaInicio,
        horaFin,
        negocioId
      );

      if (!tieneCapacidad) {
        throw new Error('No hay capacidad disponible en la sucursal para este horario');
      }
    }

    // 6. Crear la cita con el precio del servicio
    const cita = await this.citaRepository.create({
      fecha: this.parseDate(dto.fecha),
      horaInicio: dto.horaInicio, // Guardar como string "09:00"
      horaFin: dto.horaFin,       // Guardar como string "10:00"
      notas: dto.notas,
      precioTotal: Number(servicio.precio), // Se toma automáticamente del servicio
      canalOrigen: dto.canalOrigen || 'MANUAL',
      creadoPor,
      cliente: { connect: { id: dto.clienteId } },
      servicio: { connect: { id: dto.servicioId } },
      sucursal: { connect: { id: dto.sucursalId } },
      negocio: { connect: { id: negocioId } },
      ...(dto.empleadoId && {
        empleado: { connect: { id: dto.empleadoId } },
      }),
    });

    // 7. Enviar email de confirmación (asíncrono, no bloquea la respuesta)
    if (cliente.email) {
      this.enviarEmailConfirmacion(cita.id).catch((err: Error) => {
        console.error('Error enviando email de confirmación:', err);
        // No lanzamos el error para que no falle la creación de la cita
      });
    }

    return cita;
  }

  /**
   * Obtener cita por ID
   */
  async obtenerCita(id: string, negocioId: string) {
    const cita = await this.citaRepository.findById(id);

    if (!cita || cita.negocioId !== negocioId) {
      throw new Error('Cita no encontrada');
    }

    return cita;
  }

  /**
   * Listar citas con filtros
   */
  async listarCitas(negocioId: string, filtros: FiltrosCitasDto) {
    return await this.citaRepository.findMany(negocioId, filtros);
  }

  /**
   * Obtener citas de un día específico
   */
  async obtenerCitasPorFecha(negocioId: string, fecha: string, sucursalId?: string) {
    const fechaDate = this.parseDate(fecha); // Usar parseDate para evitar conversión UTC
    return await this.citaRepository.findByDate(negocioId, fechaDate, sucursalId);
  }

  /**
   * Actualizar una cita
   */
  async actualizarCita(
    id: string,
    negocioId: string,
    dto: UpdateCitaDto,
    modificadoPor?: string
  ) {
    // Verificar que la cita existe y pertenece al negocio
    const citaExistente = await this.obtenerCita(id, negocioId);

    console.log('🔍 BACKEND SERVICE - Cita existente:', {
      id: citaExistente.id,
      fecha: citaExistente.fecha,
      horaInicio: this.dateToTimeString(citaExistente.horaInicio),
      horaFin: this.dateToTimeString(citaExistente.horaFin),
      servicioId: citaExistente.servicioId,
      empleadoId: citaExistente.empleadoId,
      sucursalId: citaExistente.sucursalId,
    });

    console.log('📝 BACKEND SERVICE - DTO recibido:', dto);

    // Preparar datos finales para validaciones (usar los nuevos valores o los existentes)
    // IMPORTANTE: Asegurar que fecha sea siempre un Date válido en zona horaria local
    let fecha: Date;
    if (dto.fecha) {
      // Si viene fecha nueva en el DTO, parsearla
      fecha = this.parseDate(dto.fecha);
      console.log('📅 Usando nueva fecha del DTO:', dto.fecha, '→', fecha, '→ día', fecha.getDay());
    } else {
      // Si NO viene fecha, usar la existente pero asegurar que sea Date local
      // Prisma devuelve Date en UTC, necesitamos convertirlo a fecha local sin hora
      const fechaExistente = citaExistente.fecha;
      
      if (typeof fechaExistente === 'string') {
        // Si es string (ej: "2025-10-27"), parsearlo
        fecha = this.parseDate(fechaExistente);
        console.log('📅 Parseando fecha existente (string):', fechaExistente, '→', fecha, '→ día', fecha.getDay());
      } else {
        // Si es Date (viene de Prisma como UTC), extraer año/mes/día y crear Date local
        const year = fechaExistente.getUTCFullYear();
        const month = fechaExistente.getUTCMonth();
        const day = fechaExistente.getUTCDate();
        fecha = new Date(year, month, day, 0, 0, 0, 0);
        console.log('📅 Convirtiendo fecha existente (Date UTC → Local):', fechaExistente.toISOString(), '→', fecha, '→ día', fecha.getDay());
      }
    }

    const horaInicio = dto.horaInicio || this.dateToTimeString(citaExistente.horaInicio);
    const horaFin = dto.horaFin || this.dateToTimeString(citaExistente.horaFin);
    const sucursalId = dto.sucursalId || citaExistente.sucursalId;
    const empleadoId = dto.empleadoId !== undefined ? dto.empleadoId : citaExistente.empleadoId;
    const diaSemana = fecha.getDay();

    console.log('🔧 BACKEND SERVICE - Datos finales para validación:', {
      fecha: fecha,
      diaSemana,
      horaInicio,
      horaFin,
      sucursalId,
      empleadoId,
    });

    // 1. Validar servicio si cambió
    let precioActualizado: number | undefined;
    if (dto.servicioId && dto.servicioId !== citaExistente.servicioId) {
      const servicio = await this.prisma.servicio.findFirst({
        where: { id: dto.servicioId, negocioId, estado: 'ACTIVO' },
      });

      if (!servicio) {
        throw new Error('Servicio no encontrado o no está activo');
      }

      precioActualizado = Number(servicio.precio);
    }

    // 2. Validar sucursal si cambió
    if (dto.sucursalId && dto.sucursalId !== citaExistente.sucursalId) {
      const sucursal = await this.prisma.sucursal.findFirst({
        where: { id: dto.sucursalId, negocioId, estado: 'ACTIVA' },
      });

      if (!sucursal) {
        throw new Error('Sucursal no encontrada o no está activa');
      }
    }

    // 3. Validar horario de la sucursal (si cambió fecha/hora/sucursal)
    if (dto.fecha || dto.horaInicio || dto.horaFin || dto.sucursalId) {
      console.log('🏢 BACKEND - Validando horario de sucursal...');
      console.log('   - Sucursal ID:', sucursalId);
      console.log('   - Día de la semana:', diaSemana, '(0=domingo, 1=lunes, ..., 6=sábado)');
      
      const horarioSucursal = await this.prisma.horarioSucursal.findFirst({
        where: {
          sucursalId,
          diaSemana,
          abierto: true,
        },
      });

      console.log('   - Horario encontrado:', horarioSucursal);

      if (!horarioSucursal) {
        console.error('❌ BACKEND - La sucursal está cerrada ese día de la semana');
        console.error('   - Buscando: sucursalId =', sucursalId, ', diaSemana =', diaSemana, ', abierto = true');
        throw new Error('La sucursal está cerrada ese día de la semana');
      }

      console.log('✅ BACKEND - Horario de sucursal válido:', {
        horaApertura: horarioSucursal.horaApertura,
        horaCierre: horarioSucursal.horaCierre,
        tieneDescanso: horarioSucursal.tieneDescanso,
        descanso: horarioSucursal.tieneDescanso ? `${horarioSucursal.descansoInicio} - ${horarioSucursal.descansoFin}` : 'No'
      });

      // 3.1. Validar que la cita esté dentro del horario de la sucursal
      if (!this.estaEnHorario(horaInicio, horaFin, horarioSucursal.horaApertura!, horarioSucursal.horaCierre!)) {
        console.error('❌ BACKEND - Cita fuera del horario de la sucursal');
        console.error('   - Cita:', horaInicio, '-', horaFin);
        console.error('   - Sucursal:', horarioSucursal.horaApertura, '-', horarioSucursal.horaCierre);
        throw new Error(
          `La cita debe estar dentro del horario de la sucursal (${horarioSucursal.horaApertura} - ${horarioSucursal.horaCierre})`
        );
      }

      // 3.2. Validar que no esté en período de descanso de la sucursal
      if (horarioSucursal.tieneDescanso && horarioSucursal.descansoInicio && horarioSucursal.descansoFin) {
        if (this.hayConflictoConDescanso(horaInicio, horaFin, horarioSucursal.descansoInicio, horarioSucursal.descansoFin)) {
          console.error('❌ BACKEND - Cita en horario de descanso de sucursal');
          throw new Error(
            `La cita no puede estar en el período de descanso de la sucursal (${horarioSucursal.descansoInicio} - ${horarioSucursal.descansoFin})`
          );
        }
      }
      
      console.log('✅ BACKEND - Validación de sucursal completada exitosamente');
    }

    // 4. Si hay empleado asignado (nuevo o existente), validar TODO
    if (empleadoId) {
      // 4.1. Validar que el empleado exista y esté activo (si cambió)
      if (dto.empleadoId && dto.empleadoId !== citaExistente.empleadoId) {
        const empleado = await this.prisma.empleado.findFirst({
          where: {
            id: dto.empleadoId,
            negocioId,
            estado: 'ACTIVO',
          },
          include: {
            sucursales: {
              where: { sucursalId },
            },
          },
        });

        if (!empleado) {
          throw new Error('Empleado no encontrado o no está activo');
        }

        if (empleado.sucursales.length === 0) {
          throw new Error('El empleado no trabaja en la sucursal seleccionada');
        }
      }

      // 4.2. Validar horario del empleado (si cambió fecha/hora/empleado)
      if (dto.fecha || dto.horaInicio || dto.horaFin || dto.empleadoId) {
        const horarioEmpleado = await this.prisma.horarioEmpleado.findFirst({
          where: {
            empleadoId,
            diaSemana,
          },
        });

        if (!horarioEmpleado) {
          throw new Error('El empleado no trabaja ese día de la semana');
        }

        // Validar que la cita esté dentro del horario del empleado
        if (!this.estaEnHorario(horaInicio, horaFin, horarioEmpleado.horaInicio, horarioEmpleado.horaFin)) {
          throw new Error(
            `La cita debe estar dentro del horario del empleado (${horarioEmpleado.horaInicio} - ${horarioEmpleado.horaFin})`
          );
        }

        // Validar período de descanso del empleado
        if (horarioEmpleado.tieneDescanso && horarioEmpleado.descansoInicio && horarioEmpleado.descansoFin) {
          if (this.hayConflictoConDescanso(horaInicio, horaFin, horarioEmpleado.descansoInicio, horarioEmpleado.descansoFin)) {
            throw new Error(
              `La cita no puede estar en el período de descanso del empleado (${horarioEmpleado.descansoInicio} - ${horarioEmpleado.descansoFin})`
            );
          }
        }
      }

      // 4.3. Validar bloqueos del empleado (si cambió fecha/empleado)
      if (dto.fecha || dto.empleadoId) {
        const bloqueos = await this.prisma.bloqueoEmpleado.findMany({
          where: {
            empleadoId,
            fechaInicio: { lte: fecha },
            fechaFin: { gte: fecha },
          },
        });

        if (bloqueos.length > 0) {
          // Si hay bloqueo de todo el día
          if (bloqueos.some(b => b.todoElDia)) {
            throw new Error('El empleado no está disponible ese día (día bloqueado)');
          }

          // Si hay bloqueos por horas
          const bloqueoPorHoras = bloqueos.find(b => !b.todoElDia && b.horaInicio && b.horaFin);
          if (bloqueoPorHoras) {
            if (this.hayConflictoConDescanso(horaInicio, horaFin, bloqueoPorHoras.horaInicio!, bloqueoPorHoras.horaFin!)) {
              throw new Error(
                `El empleado tiene un bloqueo en ese horario (${bloqueoPorHoras.horaInicio} - ${bloqueoPorHoras.horaFin})`
              );
            }
          }
        }
      }

      // 4.4. Validar conflicto con otras citas del empleado
      const hayConflicto = await this.citaRepository.checkConflicto(
        empleadoId,
        null,
        fecha,
        horaInicio,
        horaFin,
        id // Excluir la cita actual
      );

      if (hayConflicto) {
        throw new Error('El empleado ya tiene una cita en ese horario');
      }
    } else {
      // 5. Si NO hay empleado asignado, validar capacidad de la sucursal
      if (dto.fecha || dto.horaInicio || dto.horaFin || dto.sucursalId) {
        const tieneCapacidad = await this.validarCapacidadSucursalParaActualizacion(
          sucursalId,
          fecha,
          horaInicio,
          horaFin,
          negocioId,
          id // Excluir la cita actual
        );

        if (!tieneCapacidad) {
          throw new Error('No hay capacidad disponible en la sucursal para este horario');
        }
      }
    }

    const updateData: any = {
      ...(dto.fecha && { fecha: this.parseDate(dto.fecha) }),
      ...(dto.horaInicio && { horaInicio: dto.horaInicio }),
      ...(dto.horaFin && { horaFin: dto.horaFin }),
      ...(dto.notas !== undefined && { notas: dto.notas }),
      ...(precioActualizado !== undefined && { precioTotal: precioActualizado }),
      ...(dto.estado && { estado: dto.estado }),
      modificadoPor,
    };

    if (dto.empleadoId !== undefined) {
      updateData.empleado = dto.empleadoId
        ? { connect: { id: dto.empleadoId } }
        : { disconnect: true };
    }

    if (dto.sucursalId) {
      updateData.sucursal = { connect: { id: dto.sucursalId } };
    }

    if (dto.servicioId) {
      updateData.servicio = { connect: { id: dto.servicioId } };
    }

    return await this.citaRepository.update(id, updateData);
  }

  /**
   * Cambiar estado de una cita
   */
  async cambiarEstado(
    id: string,
    negocioId: string,
    estado: EstadoCita,
    modificadoPor?: string
  ) {
    await this.obtenerCita(id, negocioId);
    return await this.citaRepository.updateEstado(id, estado, modificadoPor);
  }

  /**
   * Cancelar una cita
   */
  async cancelarCita(id: string, negocioId: string, modificadoPor?: string) {
    return await this.cambiarEstado(id, negocioId, 'CANCELADA', modificadoPor);
  }

  /**
   * Confirmar una cita
   */
  async confirmarCita(id: string, negocioId: string, modificadoPor?: string) {
    return await this.cambiarEstado(id, negocioId, 'CONFIRMADA', modificadoPor);
  }

  /**
   * Completar una cita
   */
  async completarCita(id: string, negocioId: string, modificadoPor?: string) {
    return await this.cambiarEstado(id, negocioId, 'COMPLETADA', modificadoPor);
  }

  /**
   * Marcar como no asistió
   */
  async marcarNoAsistio(id: string, negocioId: string, modificadoPor?: string) {
    return await this.cambiarEstado(id, negocioId, 'NO_ASISTIO', modificadoPor);
  }

  /**
   * Eliminar una cita
   */
  async eliminarCita(id: string, negocioId: string) {
    await this.obtenerCita(id, negocioId);
    return await this.citaRepository.delete(id);
  }

  /**
   * Obtener disponibilidad de horarios
   */
  async obtenerDisponibilidad(
    negocioId: string,
    dto: DisponibilidadEmpleadoDto
  ): Promise<HorarioDisponible[]> {
    const { empleadoId, sucursalId, servicioId, fecha } = dto;

    // Obtener servicio para conocer duración
    const servicio = await this.prisma.servicio.findFirst({
      where: { id: servicioId, negocioId },
    });

    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }

    // Obtener horario de la sucursal para el día de la semana
    const fechaDate = this.parseDate(fecha);
    const diaSemana = fechaDate.getDay();

    const horarioSucursal = await this.prisma.horarioSucursal.findFirst({
      where: {
        sucursalId,
        diaSemana,
        abierto: true,
      },
    });

    if (!horarioSucursal || !horarioSucursal.horaApertura || !horarioSucursal.horaCierre) {
      return [];
    }

    // Si se especifica empleado, obtener su horario y bloqueos
    let horarioEmpleado = null;
    let bloqueosEmpleado: any[] = [];
    
    if (empleadoId) {
      horarioEmpleado = await this.prisma.horarioEmpleado.findFirst({
        where: {
          empleadoId,
          diaSemana,
        },
      });

      // Verificar bloqueos del empleado para la fecha
      bloqueosEmpleado = await this.prisma.bloqueoEmpleado.findMany({
        where: {
          empleadoId,
          fechaInicio: { lte: fechaDate },
          fechaFin: { gte: fechaDate },
        },
      });

      // Si hay bloqueo de todo el día, no hay disponibilidad
      if (bloqueosEmpleado.some(b => b.todoElDia)) {
        return [];
      }
    }

    // Determinar horario de trabajo (empleado o sucursal)
    const horaInicio = empleadoId && horarioEmpleado
      ? horarioEmpleado.horaInicio
      : horarioSucursal.horaApertura;
    const horaFin = empleadoId && horarioEmpleado
      ? horarioEmpleado.horaFin
      : horarioSucursal.horaCierre;

    // Obtener períodos de descanso
    const descansoSucursal = horarioSucursal.tieneDescanso ? {
      inicio: horarioSucursal.descansoInicio,
      fin: horarioSucursal.descansoFin,
    } : null;

    const descansoEmpleado = (empleadoId && horarioEmpleado?.tieneDescanso) ? {
      inicio: horarioEmpleado.descansoInicio,
      fin: horarioEmpleado.descansoFin,
    } : null;

    // Obtener citas existentes del empleado o sucursal
    const citasExistentes = await this.prisma.cita.findMany({
      where: {
        negocioId,
        fecha: fechaDate,
        ...(empleadoId ? { empleadoId } : { sucursalId }),
        estado: { notIn: ['CANCELADA'] },
      },
      select: {
        horaInicio: true,
        horaFin: true,
      },
      orderBy: { horaInicio: 'asc' },
    });

    // Generar slots de tiempo disponibles
    const slots = this.generarSlots(
      horaInicio,
      horaFin,
      servicio.duracion,
      citasExistentes,
      descansoSucursal,
      descansoEmpleado,
      bloqueosEmpleado
    );

    return slots;
  }

  /**
   * Obtener estadísticas de citas
   */
  async obtenerEstadisticas(negocioId: string, fechaInicio?: string, fechaFin?: string) {
    const inicio = fechaInicio ? this.parseDate(fechaInicio) : undefined; // Usar parseDate para evitar UTC
    const fin = fechaFin ? this.parseDate(fechaFin) : undefined;

    return await this.citaRepository.getEstadisticas(negocioId, inicio, fin);
  }

  /**
   * Obtener próximas citas de un cliente
   */
  async obtenerProximasCitasCliente(clienteId: string, negocioId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, negocioId },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    return await this.citaRepository.getProximasCitasCliente(clienteId);
  }

  /**
   * Obtener historial de citas de un cliente
   */
  async obtenerHistorialCliente(clienteId: string, negocioId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, negocioId },
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    return await this.citaRepository.getHistorialCliente(clienteId);
  }

  /**
   * Validar capacidad de la sucursal para una cita sin empleado asignado
   */
  private async validarCapacidadSucursal(
    sucursalId: string,
    fecha: Date,
    horaInicio: string,
    horaFin: string,
    negocioId: string
  ): Promise<boolean> {
    const diaSemana = fecha.getDay();

    // 1. Obtener todos los empleados ACTIVOS que trabajan en esta sucursal
    const empleadosSucursal = await this.prisma.empleadoSucursal.findMany({
      where: {
        sucursalId,
        empleado: {
          negocioId,
          estado: 'ACTIVO',
        },
      },
      include: {
        empleado: {
          include: {
            horarios: {
              where: { diaSemana },
            },
            bloqueos: {
              where: {
                fechaInicio: { lte: fecha },
                fechaFin: { gte: fecha },
              },
            },
          },
        },
      },
    });

    // 2. Filtrar empleados que realmente están disponibles en ese horario
    const empleadosDisponibles = empleadosSucursal.filter((es) => {
      const empleado = es.empleado;

      // Si tiene bloqueo de todo el día, no está disponible
      if (empleado.bloqueos.some((b) => b.todoElDia)) {
        return false;
      }

      // Si tiene bloqueo de horas que solapa con la cita
      const tieneBloqueoHoras = empleado.bloqueos.some((b) => {
        if (b.todoElDia || !b.horaInicio || !b.horaFin) return false;

        // Comparar usando minutos
        const bloqueoInicioMin = this.timeToMinutes(b.horaInicio);
        const bloqueoFinMin = this.timeToMinutes(b.horaFin);
        const horaInicioMin = this.timeToMinutes(horaInicio);
        const horaFinMin = this.timeToMinutes(horaFin);

        // Verificar solapamiento
        return (
          (horaInicioMin >= bloqueoInicioMin && horaInicioMin < bloqueoFinMin) ||
          (horaFinMin > bloqueoInicioMin && horaFinMin <= bloqueoFinMin) ||
          (horaInicioMin <= bloqueoInicioMin && horaFinMin >= bloqueoFinMin)
        );
      });

      if (tieneBloqueoHoras) {
        return false;
      }

      // Verificar si tiene horario configurado para este día
      const horario = empleado.horarios[0];
      if (!horario) {
        return false; // No trabaja este día
      }

      // Verificar si la cita está dentro del horario de trabajo usando minutos
      const horarioInicioMin = this.timeToMinutes(horario.horaInicio);
      const horarioFinMin = this.timeToMinutes(horario.horaFin);
      const horaInicioMin = this.timeToMinutes(horaInicio);
      const horaFinMin = this.timeToMinutes(horaFin);

      if (horaInicioMin < horarioInicioMin || horaFinMin > horarioFinMin) {
        return false; // Cita fuera de horario laboral
      }

      // Verificar si la cita cae en horario de descanso
      if (horario.tieneDescanso && horario.descansoInicio && horario.descansoFin) {
        const descansoInicioMin = this.timeToMinutes(horario.descansoInicio);
        const descansoFinMin = this.timeToMinutes(horario.descansoFin);

        // Verificar solapamiento con descanso
        if (
          (horaInicioMin >= descansoInicioMin && horaInicioMin < descansoFinMin) ||
          (horaFinMin > descansoInicioMin && horaFinMin <= descansoFinMin) ||
          (horaInicioMin <= descansoInicioMin && horaFinMin >= descansoFinMin)
        ) {
          return false; // Cita en horario de descanso
        }
      }

      return true;
    });

    const totalEmpleadosDisponibles = empleadosDisponibles.length;

    // Si la sucursal no tiene empleados, considerar capacidad de 1
    const capacidadFinal = totalEmpleadosDisponibles === 0 ? 1 : totalEmpleadosDisponibles;

    // 3. Contar citas existentes en ese horario (tanto con empleado como sin empleado)
    const citasExistentes = await this.prisma.cita.findMany({
      where: {
        sucursalId,
        fecha,
        estado: { notIn: ['CANCELADA'] },
        OR: [
          {
            horaInicio: { lte: horaInicio },
            horaFin: { gt: horaInicio },
          },
          {
            horaInicio: { lt: horaFin },
            horaFin: { gte: horaFin },
          },
          {
            horaInicio: { gte: horaInicio },
            horaFin: { lte: horaFin },
          },
        ],
      },
    });

    const totalCitasSimultaneas = citasExistentes.length;

    // 4. Validar: debe haber más capacidad disponible que citas simultáneas
    // Si no hay empleados (0 o ninguno) → capacidad = 1
    // Si hay empleados → capacidad = número de empleados disponibles
    return capacidadFinal > totalCitasSimultaneas;
  }

  /**
   * Validar capacidad de la sucursal para actualizar una cita (excluye la cita actual)
   */
  private async validarCapacidadSucursalParaActualizacion(
    sucursalId: string,
    fecha: Date,
    horaInicio: string,
    horaFin: string,
    negocioId: string,
    citaIdExcluir: string
  ): Promise<boolean> {
    const diaSemana = fecha.getDay();

    // 1. Obtener todos los empleados ACTIVOS que trabajan en esta sucursal
    const empleadosSucursal = await this.prisma.empleadoSucursal.findMany({
      where: {
        sucursalId,
        empleado: {
          negocioId,
          estado: 'ACTIVO',
        },
      },
      include: {
        empleado: {
          include: {
            horarios: {
              where: { diaSemana },
            },
            bloqueos: {
              where: {
                fechaInicio: { lte: fecha },
                fechaFin: { gte: fecha },
              },
            },
          },
        },
      },
    });

    // 2. Filtrar empleados que realmente están disponibles en ese horario
    const empleadosDisponibles = empleadosSucursal.filter((es) => {
      const empleado = es.empleado;

      // Si tiene bloqueo de todo el día, no está disponible
      if (empleado.bloqueos.some((b) => b.todoElDia)) {
        return false;
      }

      // Si tiene bloqueo de horas que solapa con la cita
      const tieneBloqueoHoras = empleado.bloqueos.some((b) => {
        if (b.todoElDia || !b.horaInicio || !b.horaFin) return false;

        // Comparar usando minutos
        const bloqueoInicioMin = this.timeToMinutes(b.horaInicio);
        const bloqueoFinMin = this.timeToMinutes(b.horaFin);
        const horaInicioMin = this.timeToMinutes(horaInicio);
        const horaFinMin = this.timeToMinutes(horaFin);

        // Verificar solapamiento
        return (
          (horaInicioMin >= bloqueoInicioMin && horaInicioMin < bloqueoFinMin) ||
          (horaFinMin > bloqueoInicioMin && horaFinMin <= bloqueoFinMin) ||
          (horaInicioMin <= bloqueoInicioMin && horaFinMin >= bloqueoFinMin)
        );
      });

      if (tieneBloqueoHoras) {
        return false;
      }

      // Verificar si tiene horario configurado para este día
      const horario = empleado.horarios[0];
      if (!horario) {
        return false; // No trabaja este día
      }

      // Verificar si la cita está dentro del horario de trabajo usando minutos
      const horarioInicioMin = this.timeToMinutes(horario.horaInicio);
      const horarioFinMin = this.timeToMinutes(horario.horaFin);
      const horaInicioMin = this.timeToMinutes(horaInicio);
      const horaFinMin = this.timeToMinutes(horaFin);

      if (horaInicioMin < horarioInicioMin || horaFinMin > horarioFinMin) {
        return false; // Cita fuera de horario laboral
      }

      // Verificar si la cita cae en horario de descanso
      if (horario.tieneDescanso && horario.descansoInicio && horario.descansoFin) {
        const descansoInicioMin = this.timeToMinutes(horario.descansoInicio);
        const descansoFinMin = this.timeToMinutes(horario.descansoFin);

        // Verificar solapamiento con descanso
        if (
          (horaInicioMin >= descansoInicioMin && horaInicioMin < descansoFinMin) ||
          (horaFinMin > descansoInicioMin && horaFinMin <= descansoFinMin) ||
          (horaInicioMin <= descansoInicioMin && horaFinMin >= descansoFinMin)
        ) {
          return false; // Cita en horario de descanso
        }
      }

      return true;
    });

    const totalEmpleadosDisponibles = empleadosDisponibles.length;

    // Si la sucursal no tiene empleados, considerar capacidad de 1
    const capacidadFinal = totalEmpleadosDisponibles === 0 ? 1 : totalEmpleadosDisponibles;

    // 3. Contar citas existentes en ese horario (excluyendo la cita actual)
    const citasExistentes = await this.prisma.cita.findMany({
      where: {
        sucursalId,
        fecha,
        id: { not: citaIdExcluir }, // EXCLUIR LA CITA ACTUAL
        estado: { notIn: ['CANCELADA'] },
        OR: [
          {
            horaInicio: { lte: horaInicio },
            horaFin: { gt: horaInicio },
          },
          {
            horaInicio: { lt: horaFin },
            horaFin: { gte: horaFin },
          },
          {
            horaInicio: { gte: horaInicio },
            horaFin: { lte: horaFin },
          },
        ],
      },
    });

    const totalCitasSimultaneas = citasExistentes.length;

    // 4. Validar: debe haber más capacidad disponible que citas simultáneas
    return capacidadFinal > totalCitasSimultaneas;
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Parsear fecha en formato "YYYY-MM-DD" a Date en zona horaria Ecuador
   */
  private parseDate(dateString: string): Date {
    // Parsear como fecha local de Ecuador (evita conversión UTC)
    const [year, month, day] = dateString.split('-').map(Number);
    // Mes es 0-indexed en JavaScript
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * Convertir Date a string de hora "HH:MM"
   * Para compatibilidad con datos existentes antes de migración
   */
  private dateToTimeString(value: Date | string): string {
    if (typeof value === 'string') {
      return value; // Ya es string
    }
    // Convertir Date a formato "HH:MM"
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Generar slots de tiempo disponibles
   */
  private generarSlots(
    horaInicio: string,
    horaFin: string,
    duracionMinutos: number,
    citasExistentes: { horaInicio: Date | string; horaFin: Date | string }[],
    descansoSucursal: { inicio: string | null; fin: string | null } | null,
    descansoEmpleado: { inicio: string | null; fin: string | null } | null,
    bloqueosEmpleado: any[]
  ): HorarioDisponible[] {
    const slots: HorarioDisponible[] = [];
    const [inicioHoras, inicioMinutos] = horaInicio.split(':').map(Number);
    const [finHoras, finMinutos] = horaFin.split(':').map(Number);

    let currentMinutes = inicioHoras * 60 + inicioMinutos;
    const endMinutes = finHoras * 60 + finMinutos;

    while (currentMinutes + duracionMinutos <= endMinutes) {
      const slotInicio = this.minutesToTime(currentMinutes);
      const slotFin = this.minutesToTime(currentMinutes + duracionMinutos);

      // Verificar si el slot está en período de descanso
      const enDescansoSucursal = this.estaEnDescanso(
        slotInicio,
        slotFin,
        descansoSucursal
      );

      const enDescansoEmpleado = this.estaEnDescanso(
        slotInicio,
        slotFin,
        descansoEmpleado
      );

      // Verificar si el slot está en un bloqueo de horas del empleado
      const enBloqueo = this.estaEnBloqueo(slotInicio, slotFin, bloqueosEmpleado);

      // Verificar si hay conflicto con citas existentes
      const hayConflicto = this.hayConflictoEnSlot(slotInicio, slotFin, citasExistentes);

      // El slot está disponible si no hay ningún impedimento
      const disponible = !enDescansoSucursal && !enDescansoEmpleado && !enBloqueo && !hayConflicto;

      slots.push({
        horaInicio: slotInicio,
        horaFin: slotFin,
        disponible,
      });

      currentMinutes += 30; // Intervalos de 30 minutos
    }

    return slots;
  }

  /**
   * Convertir minutos a formato "HH:MM"
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Verificar si hay conflicto en un slot de tiempo
   */
  private hayConflictoEnSlot(
    slotInicio: string,
    slotFin: string,
    citas: { horaInicio: Date | string; horaFin: Date | string }[]
  ): boolean {
    const slotInicioMin = this.timeToMinutes(slotInicio);
    const slotFinMin = this.timeToMinutes(slotFin);

    return citas.some((cita) => {
      // Convertir a string si es Date (para compatibilidad)
      const citaInicioStr = this.dateToTimeString(cita.horaInicio);
      const citaFinStr = this.dateToTimeString(cita.horaFin);
      
      const citaInicioMin = this.timeToMinutes(citaInicioStr);
      const citaFinMin = this.timeToMinutes(citaFinStr);

      return (
        (slotInicioMin >= citaInicioMin && slotInicioMin < citaFinMin) ||
        (slotFinMin > citaInicioMin && slotFinMin <= citaFinMin) ||
        (slotInicioMin <= citaInicioMin && slotFinMin >= citaFinMin)
      );
    });
  }

  /**
   * Verificar si el slot está en período de descanso
   */
  private estaEnDescanso(
    slotInicio: string,
    slotFin: string,
    descanso: { inicio: string | null; fin: string | null } | null
  ): boolean {
    if (!descanso || !descanso.inicio || !descanso.fin) {
      return false;
    }

    const slotInicioMinutes = this.timeToMinutes(slotInicio);
    const slotFinMinutes = this.timeToMinutes(slotFin);
    const descansoInicioMinutes = this.timeToMinutes(descanso.inicio);
    const descansoFinMinutes = this.timeToMinutes(descanso.fin);

    // Verificar si hay solapamiento con el período de descanso
    return (
      (slotInicioMinutes >= descansoInicioMinutes && slotInicioMinutes < descansoFinMinutes) ||
      (slotFinMinutes > descansoInicioMinutes && slotFinMinutes <= descansoFinMinutes) ||
      (slotInicioMinutes <= descansoInicioMinutes && slotFinMinutes >= descansoFinMinutes)
    );
  }

  /**
   * Verificar si el slot está en un bloqueo de horas del empleado
   */
  private estaEnBloqueo(
    slotInicio: string,
    slotFin: string,
    bloqueos: any[]
  ): boolean {
    if (bloqueos.length === 0) {
      return false;
    }

    // Buscar bloqueos parciales (no todo el día) que afecten este slot
    return bloqueos.some((bloqueo) => {
      if (bloqueo.todoElDia) {
        return false; // Ya manejado en obtenerDisponibilidad
      }

      if (!bloqueo.horaInicio || !bloqueo.horaFin) {
        return false;
      }

      const slotInicioMinutes = this.timeToMinutes(slotInicio);
      const slotFinMinutes = this.timeToMinutes(slotFin);
      const bloqueoInicioMinutes = this.timeToMinutes(bloqueo.horaInicio);
      const bloqueoFinMinutes = this.timeToMinutes(bloqueo.horaFin);

      // Verificar si hay solapamiento
      return (
        (slotInicioMinutes >= bloqueoInicioMinutes && slotInicioMinutes < bloqueoFinMinutes) ||
        (slotFinMinutes > bloqueoInicioMinutes && slotFinMinutes <= bloqueoFinMinutes) ||
        (slotInicioMinutes <= bloqueoInicioMinutes && slotFinMinutes >= bloqueoFinMinutes)
      );
    });
  }

  /**
   * Convertir formato "HH:MM" a minutos totales
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Validar que la cita esté dentro del horario (apertura/cierre o inicio/fin)
   */
  private estaEnHorario(
    citaInicio: string,
    citaFin: string,
    horarioInicio: string,
    horarioFin: string
  ): boolean {
    const citaInicioMin = this.timeToMinutes(citaInicio);
    const citaFinMin = this.timeToMinutes(citaFin);
    const horarioInicioMin = this.timeToMinutes(horarioInicio);
    const horarioFinMin = this.timeToMinutes(horarioFin);

    // La cita debe iniciar después o igual al horario de inicio
    // Y terminar antes o igual al horario de fin
    return citaInicioMin >= horarioInicioMin && citaFinMin <= horarioFinMin;
  }

  /**
   * Verificar si hay conflicto con período de descanso o bloqueo
   */
  private hayConflictoConDescanso(
    citaInicio: string,
    citaFin: string,
    descansoInicio: string,
    descansoFin: string
  ): boolean {
    const citaInicioMin = this.timeToMinutes(citaInicio);
    const citaFinMin = this.timeToMinutes(citaFin);
    const descansoInicioMin = this.timeToMinutes(descansoInicio);
    const descansoFinMin = this.timeToMinutes(descansoFin);

    // Hay conflicto si la cita se solapa con el período de descanso
    return (
      (citaInicioMin >= descansoInicioMin && citaInicioMin < descansoFinMin) ||
      (citaFinMin > descansoInicioMin && citaFinMin <= descansoFinMin) ||
      (citaInicioMin <= descansoInicioMin && citaFinMin >= descansoFinMin)
    );
  }

  /**
   * Enviar email de confirmación de cita
   * Este método obtiene toda la información necesaria y envía el email
   */
  private async enviarEmailConfirmacion(citaId: string): Promise<void> {
    try {
      // Obtener todos los datos necesarios para el email
      const cita = await this.prisma.cita.findUnique({
        where: { id: citaId },
        include: {
          cliente: true,
          servicio: true,
          empleado: true,
          sucursal: true,
          negocio: true,
        },
      });

      if (!cita || !cita.cliente.email) {
        console.log('⚠️  No se puede enviar email: cita no encontrada o cliente sin email');
        return;
      }

      // Formatear la fecha para el email (ej: "Lunes 30 de Octubre, 2025")
      const fechaFormateada = this.formatearFechaParaEmail(cita.fecha);

      // Formatear la hora (ej: "09:00 AM - 10:00 AM")
      const horaFormateada = `${cita.horaInicio} - ${cita.horaFin}`;

      // Log de datos que se enviarán
      console.log('📧 Preparando email con los siguientes datos:');
      console.log(`   Cliente: ${cita.cliente.nombre} (${cita.cliente.email})`);
      console.log(`   Negocio: ${cita.negocio.nombre || 'SIN NOMBRE'}`);
      console.log(`   Servicio: ${cita.servicio.nombre}`);
      console.log(`   Empleado: ${cita.empleado?.nombre || 'Sin asignar'}`);
      console.log(`   Fecha: ${fechaFormateada}`);
      console.log(`   Hora: ${horaFormateada}`);
      console.log(`   Sucursal: ${cita.sucursal.nombre}`);

      // Enviar el email
      const resultado = await emailService.enviarConfirmacionCita({
        emailDestinatario: cita.cliente.email,
        nombreCliente: cita.cliente.nombre,
        nombreNegocio: cita.negocio.nombre || 'Nuestro Negocio',
        nombreServicio: cita.servicio.nombre,
        nombreEmpleado: cita.empleado?.nombre || 'Nuestro equipo',
        fecha: fechaFormateada,
        hora: horaFormateada,
        nombreSucursal: cita.sucursal.nombre,
        direccionSucursal: cita.sucursal.direccion || undefined,
        telefonoSucursal: cita.sucursal.telefono || undefined,
        googleMapsUrl: cita.sucursal.googleMapsUrl || undefined,
      });

      if (resultado.success) {
        console.log(`✅ Email de confirmación enviado a ${cita.cliente.email}`);
      } else {
        console.warn(`⚠️  No se pudo enviar email: ${resultado.error}`);
      }
    } catch (error) {
      console.error('❌ Error en enviarEmailConfirmacion:', error);
      // No lanzamos el error para que no afecte la creación de la cita
    }
  }

  /**
   * Formatear fecha para mostrar en email
   */
  private formatearFechaParaEmail(fecha: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    const diaSemana = dias[fecha.getDay()];

    return `${diaSemana} ${dia} de ${mes}, ${año}`;
  }
}

