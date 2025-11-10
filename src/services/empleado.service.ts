// src/services/empleado.service.ts

import { PrismaClient } from '@prisma/client';
import { EmpleadoRepository } from '../repositories/empleado.repository';
import {
  EmpleadoDto,
  EmpleadoUpdateDto,
  EmpleadosListResponse,
  HorarioEmpleadoDto,
  BloqueoEmpleadoDto,
} from '../models/empleado.model';

export class EmpleadoService {
  private repository: EmpleadoRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new EmpleadoRepository(prisma);
  }

  /**
   * Listar todos los empleados con paginación
   */
  async listarEmpleados(
    negocioId: string,
    pagina: number = 1,
    limite: number = 50
  ): Promise<EmpleadosListResponse> {
    return await this.repository.findAll(negocioId, pagina, limite);
  }

  /**
   * Obtener un empleado por ID
   */
  async obtenerEmpleado(id: string, negocioId: string) {
    const empleado = await this.repository.findById(id, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }
    return empleado;
  }

  /**
   * Crear un nuevo empleado
   */
  async crearEmpleado(negocioId: string, dto: EmpleadoDto) {
    // Validar campos requeridos
    if (!dto.nombre || dto.nombre.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    if (!dto.cargo || dto.cargo.trim() === '') {
      throw new Error('El cargo es requerido');
    }

    if (!dto.telefono || dto.telefono.trim() === '') {
      throw new Error('El teléfono es requerido');
    }

    if (!dto.email || dto.email.trim() === '') {
      throw new Error('El email es requerido');
    }

    // Validar formato de teléfono (básico)
    const telefonoLimpio = dto.telefono.replace(/\s+/g, '');
    if (telefonoLimpio.length < 7) {
      throw new Error('El teléfono debe tener al menos 7 dígitos');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new Error('El formato del email no es válido');
    }

    // Verificar que no exista un empleado con el mismo email en este negocio
    const empleadoConEmail = await this.repository.existsByEmail(
      dto.email.trim().toLowerCase(),
      negocioId
    );
    if (empleadoConEmail) {
      throw new Error(
        `Ya existe un empleado con el email ${dto.email} en tu negocio`
      );
    }

    // Verificar que no exista un empleado con el mismo teléfono en este negocio
    const empleadoConTelefono = await this.repository.existsByTelefono(
      telefonoLimpio,
      negocioId
    );
    if (empleadoConTelefono) {
      throw new Error(
        `Ya existe un empleado con el teléfono ${dto.telefono} en tu negocio`
      );
    }

    // Crear empleado
    return await this.repository.create(negocioId, {
      nombre: dto.nombre.trim(),
      cargo: dto.cargo.trim(),
      telefono: telefonoLimpio,
      email: dto.email.trim().toLowerCase(),
      foto: dto.foto?.trim(),
    });
  }

  /**
   * Actualizar un empleado
   */
  async actualizarEmpleado(
    id: string,
    negocioId: string,
    dto: EmpleadoUpdateDto
  ) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleadoExistente = await this.repository.findById(id, negocioId);
    if (!empleadoExistente) {
      throw new Error('Empleado no encontrado');
    }

    // Validar nombre si se proporciona
    if (dto.nombre !== undefined) {
      if (!dto.nombre || dto.nombre.trim() === '') {
        throw new Error('El nombre no puede estar vacío');
      }
      dto.nombre = dto.nombre.trim();
    }

    // Validar cargo si se proporciona
    if (dto.cargo !== undefined) {
      if (!dto.cargo || dto.cargo.trim() === '') {
        throw new Error('El cargo no puede estar vacío');
      }
      dto.cargo = dto.cargo.trim();
    }

    // Validar teléfono si se proporciona
    if (dto.telefono !== undefined) {
      if (!dto.telefono || dto.telefono.trim() === '') {
        throw new Error('El teléfono no puede estar vacío');
      }

      const telefonoLimpio = dto.telefono.replace(/\s+/g, '');
      if (telefonoLimpio.length < 7) {
        throw new Error('El teléfono debe tener al menos 7 dígitos');
      }

      // Verificar que no exista otro empleado con el mismo teléfono
      const empleadoConTelefono = await this.repository.existsByTelefono(
        telefonoLimpio,
        negocioId,
        id
      );
      if (empleadoConTelefono) {
        throw new Error(
          `Ya existe otro empleado con el teléfono ${dto.telefono}`
        );
      }

      dto.telefono = telefonoLimpio;
    }

    // Validar email si se proporciona
    if (dto.email !== undefined) {
      if (!dto.email || dto.email.trim() === '') {
        throw new Error('El email no puede estar vacío');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new Error('El formato del email no es válido');
      }

      // Verificar que no exista otro empleado con el mismo email
      const empleadoConEmail = await this.repository.existsByEmail(
        dto.email.trim().toLowerCase(),
        negocioId,
        id
      );
      if (empleadoConEmail) {
        throw new Error(`Ya existe otro empleado con el email ${dto.email}`);
      }

      dto.email = dto.email.trim().toLowerCase();
    }

    // Validar estado si se proporciona
    if (dto.estado !== undefined) {
      if (!['ACTIVO', 'INACTIVO'].includes(dto.estado)) {
        throw new Error('El estado debe ser ACTIVO o INACTIVO');
      }
    }

    // Actualizar empleado
    return await this.repository.update(id, dto);
  }

  /**
   * Eliminar un empleado
   */
  async eliminarEmpleado(id: string, negocioId: string) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleadoExistente = await this.repository.findById(id, negocioId);
    if (!empleadoExistente) {
      throw new Error('Empleado no encontrado');
    }

    // Verificar si tiene citas asociadas
    const citasCount = await this.repository.countCitas(id);
    if (citasCount > 0) {
      throw new Error(
        `No se puede eliminar el empleado porque tiene ${citasCount} cita(s) asociada(s). Considere cambiar su estado a INACTIVO.`
      );
    }

    return await this.repository.delete(id);
  }

  // ============================================================================
  // HORARIOS
  // ============================================================================

  /**
   * Obtener horarios de un empleado
   */
  async obtenerHorarios(empleadoId: string, negocioId: string) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    return await this.repository.findHorarios(empleadoId);
  }

  /**
   * Actualizar horarios de un empleado (reemplaza todos)
   */
  async actualizarHorarios(
    empleadoId: string,
    negocioId: string,
    horarios: HorarioEmpleadoDto[]
  ) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // Validar horarios
    for (const horario of horarios) {
      this.validarHorario(horario);
    }

    // Validar que no haya días duplicados
    const diasUnicos = new Set(horarios.map((h) => h.diaSemana));
    if (diasUnicos.size !== horarios.length) {
      throw new Error('No puede haber horarios duplicados para el mismo día');
    }

    return await this.repository.upsertHorarios(empleadoId, horarios);
  }

  /**
   * Validar un horario
   */
  private validarHorario(horario: HorarioEmpleadoDto) {
    // Validar día de la semana
    if (horario.diaSemana < 0 || horario.diaSemana > 6) {
      throw new Error('El día de la semana debe estar entre 0 (Domingo) y 6 (Sábado)');
    }

    // Validar formato de horas
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(horario.horaInicio)) {
      throw new Error('El formato de hora de inicio no es válido (use HH:MM)');
    }
    if (!timeRegex.test(horario.horaFin)) {
      throw new Error('El formato de hora fin no es válido (use HH:MM)');
    }

    // Validar que hora fin sea después de hora inicio
    if (horario.horaInicio >= horario.horaFin) {
      throw new Error('La hora de fin debe ser posterior a la hora de inicio');
    }

    // Validar descanso si está presente
    if (horario.tieneDescanso) {
      if (!horario.descansoInicio || !horario.descansoFin) {
        throw new Error(
          'Si tiene descanso, debe proporcionar hora de inicio y fin del descanso'
        );
      }

      if (!timeRegex.test(horario.descansoInicio)) {
        throw new Error(
          'El formato de hora de inicio de descanso no es válido (use HH:MM)'
        );
      }
      if (!timeRegex.test(horario.descansoFin)) {
        throw new Error(
          'El formato de hora fin de descanso no es válido (use HH:MM)'
        );
      }

      // Validar que el descanso esté dentro del horario laboral
      if (
        horario.descansoInicio < horario.horaInicio ||
        horario.descansoFin > horario.horaFin
      ) {
        throw new Error('El descanso debe estar dentro del horario laboral');
      }

      // Validar que hora fin de descanso sea después de hora inicio
      if (horario.descansoInicio >= horario.descansoFin) {
        throw new Error(
          'La hora de fin de descanso debe ser posterior a la hora de inicio'
        );
      }
    }
  }

  // ============================================================================
  // BLOQUEOS
  // ============================================================================

  /**
   * Obtener bloqueos de un empleado
   */
  async obtenerBloqueos(
    empleadoId: string,
    negocioId: string,
    fechaDesde?: Date
  ) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    return await this.repository.findBloqueos(empleadoId, fechaDesde);
  }

  /**
   * Crear un bloqueo para un empleado
   */
  async crearBloqueo(
    empleadoId: string,
    negocioId: string,
    dto: BloqueoEmpleadoDto
  ) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // Validar fechas
    if (dto.fechaInicio >= dto.fechaFin) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    // Validar horas si no es todo el día
    if (!dto.todoElDia) {
      if (!dto.horaInicio || !dto.horaFin) {
        throw new Error(
          'Si no es todo el día, debe proporcionar hora de inicio y fin'
        );
      }

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(dto.horaInicio)) {
        throw new Error('El formato de hora de inicio no es válido (use HH:MM)');
      }
      if (!timeRegex.test(dto.horaFin)) {
        throw new Error('El formato de hora fin no es válido (use HH:MM)');
      }

      if (dto.horaInicio >= dto.horaFin) {
        throw new Error('La hora de fin debe ser posterior a la hora de inicio');
      }
    }

    return await this.repository.createBloqueo(empleadoId, dto);
  }

  /**
   * Eliminar un bloqueo
   */
  async eliminarBloqueo(
    bloqueoId: string,
    empleadoId: string,
    negocioId: string
  ) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // Verificar que el bloqueo existe y pertenece al empleado
    const bloqueo = await this.repository.findBloqueoById(
      bloqueoId,
      empleadoId
    );
    if (!bloqueo) {
      throw new Error('Bloqueo no encontrado');
    }

    return await this.repository.deleteBloqueo(bloqueoId);
  }

  // ============================================================================
  // SUCURSALES
  // ============================================================================

  /**
   * Obtener sucursales asignadas a un empleado
   */
  async obtenerSucursales(empleadoId: string, negocioId: string) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    return await this.repository.findSucursales(empleadoId);
  }

  /**
   * Asignar empleado a una o más sucursales
   */
  async asignarSucursales(
    empleadoId: string,
    negocioId: string,
    sucursalIds: string[]
  ) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // Validar que se proporcione al menos una sucursal
    if (!sucursalIds || sucursalIds.length === 0) {
      throw new Error('Debe proporcionar al menos una sucursal');
    }

    // Verificar que todas las sucursales existen y pertenecen al negocio
    for (const sucursalId of sucursalIds) {
      const sucursal = await this.repository.verifySucursalExists(
        sucursalId,
        negocioId
      );
      if (!sucursal) {
        throw new Error(`La sucursal con ID ${sucursalId} no existe o no pertenece a tu negocio`);
      }
    }

    // Asignar a las sucursales
    return await this.repository.assignToMultipleSucursales(
      empleadoId,
      sucursalIds
    );
  }

  /**
   * Desasignar empleado de una sucursal
   */
  async desasignarSucursal(
    empleadoId: string,
    sucursalId: string,
    negocioId: string
  ) {
    // Verificar que el empleado existe y pertenece al negocio
    const empleado = await this.repository.findById(empleadoId, negocioId);
    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // Verificar que la sucursal existe y pertenece al negocio
    const sucursal = await this.repository.verifySucursalExists(
      sucursalId,
      negocioId
    );
    if (!sucursal) {
      throw new Error('Sucursal no encontrada');
    }

    // Verificar que el empleado está asignado a la sucursal
    const isAssigned = await this.repository.isAssignedToSucursal(
      empleadoId,
      sucursalId
    );
    if (!isAssigned) {
      throw new Error('El empleado no está asignado a esta sucursal');
    }

    return await this.repository.unassignFromSucursal(empleadoId, sucursalId);
  }
}
