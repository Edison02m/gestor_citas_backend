// src/services/sucursal.service.ts

import { PrismaClient } from '@prisma/client';
import { SucursalRepository } from '../repositories/sucursal.repository';
import { SucursalResponse, SucursalDto, SucursalUpdateDto, HorarioSucursalDto } from '../models/sucursal.model';

export class SucursalService {
  private sucursalRepository: SucursalRepository;

  constructor(private prisma: PrismaClient) {
    this.sucursalRepository = new SucursalRepository(this.prisma);
  }

  /**
   * Listar todas las sucursales del negocio
   */
  async obtenerSucursales(negocioId: string): Promise<SucursalResponse[]> {
    const sucursales = await this.sucursalRepository.findByNegocioId(negocioId);
    return sucursales.map(this.toResponse);
  }

  /**
   * Obtener una sucursal por ID
   */
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

  /**
   * Crear nueva sucursal con horarios
   */
  async crearSucursal(negocioId: string, dto: SucursalDto): Promise<SucursalResponse> {
    // Validar campos requeridos
    if (!dto.nombre || dto.nombre.trim() === '') {
      throw new Error('El nombre de la sucursal es requerido');
    }

    if (!dto.direccion || dto.direccion.trim() === '') {
      throw new Error('La dirección es requerida');
    }

    if (!dto.telefono || dto.telefono.trim() === '') {
      throw new Error('El teléfono es requerido');
    }

    // Validar horarios
    if (!dto.horarios || dto.horarios.length !== 7) {
      throw new Error('Debes especificar horarios para los 7 días de la semana');
    }

    // Validar que no haya días duplicados
    const diasUnicos = new Set(dto.horarios.map(h => h.diaSemana));
    if (diasUnicos.size !== 7) {
      throw new Error('No puedes tener días duplicados en los horarios');
    }

    // Validar que todos los días sean válidos (0-6)
    const diasValidos = dto.horarios.every(h => h.diaSemana >= 0 && h.diaSemana <= 6);
    if (!diasValidos) {
      throw new Error('Los días de la semana deben estar entre 0 (Domingo) y 6 (Sábado)');
    }

    // Validar horarios de descanso
    for (const horario of dto.horarios) {
      if (horario.abierto && horario.tieneDescanso) {
        if (!horario.descansoInicio || !horario.descansoFin) {
          throw new Error(`El día ${horario.diaSemana} tiene descanso activado pero falta la hora de inicio o fin del descanso`);
        }

        // Validar que el descanso esté dentro del horario de apertura
        if (horario.horaApertura && horario.horaCierre) {
          if (horario.descansoInicio <= horario.horaApertura || horario.descansoFin >= horario.horaCierre) {
            throw new Error(`El descanso del día ${horario.diaSemana} debe estar dentro del horario de apertura`);
          }
          if (horario.descansoInicio >= horario.descansoFin) {
            throw new Error(`La hora de inicio del descanso debe ser menor que la hora de fin en el día ${horario.diaSemana}`);
          }
        }
      }
    }

    // Validar que no exista una sucursal con el mismo nombre
    const sucursalExistente = await this.sucursalRepository.existsByNombre(dto.nombre.trim(), negocioId);
    if (sucursalExistente) {
      throw new Error(`Ya existe una sucursal con el nombre "${dto.nombre}"`);
    }

    // Crear sucursal
    const sucursal = await this.sucursalRepository.create(negocioId, {
      nombre: dto.nombre.trim(),
      direccion: dto.direccion.trim(),
      ciudad: dto.ciudad?.trim(),
      provincia: dto.provincia?.trim(),
      telefono: dto.telefono.trim(),
      email: dto.email?.trim(),
      googleMapsUrl: dto.googleMapsUrl?.trim(),
      horarios: dto.horarios,
    });

    return this.toResponse(sucursal);
  }

  /**
   * Actualizar datos generales de la sucursal
   */
  async actualizarSucursal(id: string, negocioId: string, dto: SucursalUpdateDto): Promise<SucursalResponse> {
    // Verificar que la sucursal existe y pertenece al negocio
    const sucursalExistente = await this.sucursalRepository.findById(id);
    if (!sucursalExistente) {
      throw new Error('Sucursal no encontrada');
    }

    if (sucursalExistente.negocioId !== negocioId) {
      throw new Error('No tienes permisos para actualizar esta sucursal');
    }

    // Validar nombre si se proporciona
    if (dto.nombre !== undefined) {
      if (!dto.nombre || dto.nombre.trim() === '') {
        throw new Error('El nombre no puede estar vacío');
      }

      // Verificar que no exista otra sucursal con el mismo nombre
      const otraSucursal = await this.sucursalRepository.existsByNombre(dto.nombre.trim(), negocioId, id);
      if (otraSucursal) {
        throw new Error(`Ya existe otra sucursal con el nombre "${dto.nombre}"`);
      }
    }

    // Validar otros campos
    if (dto.direccion !== undefined && (!dto.direccion || dto.direccion.trim() === '')) {
      throw new Error('La dirección no puede estar vacía');
    }

    if (dto.telefono !== undefined && (!dto.telefono || dto.telefono.trim() === '')) {
      throw new Error('El teléfono no puede estar vacío');
    }

    // Validar estado si se proporciona
    if (dto.estado !== undefined) {
      if (!['ACTIVA', 'INACTIVA'].includes(dto.estado)) {
        throw new Error('El estado debe ser ACTIVA o INACTIVA');
      }
    }

    // Limpiar datos
    const dataLimpia: SucursalUpdateDto = {};
    if (dto.nombre !== undefined) dataLimpia.nombre = dto.nombre.trim();
    if (dto.direccion !== undefined) dataLimpia.direccion = dto.direccion.trim();
    if (dto.ciudad !== undefined) dataLimpia.ciudad = dto.ciudad?.trim() || null;
    if (dto.provincia !== undefined) dataLimpia.provincia = dto.provincia?.trim() || null;
    if (dto.telefono !== undefined) dataLimpia.telefono = dto.telefono.trim();
    if (dto.email !== undefined) dataLimpia.email = dto.email?.trim() || null;
    if (dto.googleMapsUrl !== undefined) dataLimpia.googleMapsUrl = dto.googleMapsUrl?.trim() || null;
    if (dto.estado !== undefined) dataLimpia.estado = dto.estado;

    const sucursal = await this.sucursalRepository.update(id, dataLimpia);
    return this.toResponse(sucursal);
  }

  /**
   * Actualizar horarios de la sucursal
   */
  async actualizarHorarios(id: string, negocioId: string, horarios: HorarioSucursalDto[]): Promise<SucursalResponse> {
    // Verificar que la sucursal existe y pertenece al negocio
    const sucursalExistente = await this.sucursalRepository.findById(id);
    if (!sucursalExistente) {
      throw new Error('Sucursal no encontrada');
    }

    if (sucursalExistente.negocioId !== negocioId) {
      throw new Error('No tienes permisos para actualizar esta sucursal');
    }

    // Validar horarios
    if (!horarios || horarios.length !== 7) {
      throw new Error('Debes especificar horarios para los 7 días de la semana');
    }

    // Validar que no haya días duplicados
    const diasUnicos = new Set(horarios.map(h => h.diaSemana));
    if (diasUnicos.size !== 7) {
      throw new Error('No puedes tener días duplicados en los horarios');
    }

    // Validar que todos los días sean válidos (0-6)
    const diasValidos = horarios.every(h => h.diaSemana >= 0 && h.diaSemana <= 6);
    if (!diasValidos) {
      throw new Error('Los días de la semana deben estar entre 0 (Domingo) y 6 (Sábado)');
    }

    // Validar horarios de descanso
    for (const horario of horarios) {
      if (horario.abierto && horario.tieneDescanso) {
        if (!horario.descansoInicio || !horario.descansoFin) {
          throw new Error(`El día ${horario.diaSemana} tiene descanso activado pero falta la hora de inicio o fin del descanso`);
        }

        // Validar que el descanso esté dentro del horario de apertura
        if (horario.horaApertura && horario.horaCierre) {
          if (horario.descansoInicio <= horario.horaApertura || horario.descansoFin >= horario.horaCierre) {
            throw new Error(`El descanso del día ${horario.diaSemana} debe estar dentro del horario de apertura`);
          }
          if (horario.descansoInicio >= horario.descansoFin) {
            throw new Error(`La hora de inicio del descanso debe ser menor que la hora de fin en el día ${horario.diaSemana}`);
          }
        }
      }
    }

    const sucursal = await this.sucursalRepository.updateHorarios(id, horarios);
    return this.toResponse(sucursal);
  }

  /**
   * Eliminar sucursal
   */
  async eliminarSucursal(id: string, negocioId: string) {
    // Verificar que la sucursal existe y pertenece al negocio
    const sucursalExistente = await this.sucursalRepository.findById(id);
    if (!sucursalExistente) {
      throw new Error('Sucursal no encontrada');
    }

    if (sucursalExistente.negocioId !== negocioId) {
      throw new Error('No tienes permisos para eliminar esta sucursal');
    }

    // Verificar si tiene relaciones
    const [cantidadEmpleados, cantidadServicios, cantidadCitas] = await Promise.all([
      this.sucursalRepository.countEmpleados(id),
      this.sucursalRepository.countServicios(id),
      this.sucursalRepository.countCitas(id),
    ]);

    if (cantidadEmpleados > 0) {
      throw new Error(`No puedes eliminar esta sucursal porque tiene ${cantidadEmpleados} empleado(s) asignado(s)`);
    }

    if (cantidadServicios > 0) {
      throw new Error(`No puedes eliminar esta sucursal porque tiene ${cantidadServicios} servicio(s) asignado(s)`);
    }

    if (cantidadCitas > 0) {
      throw new Error(`No puedes eliminar esta sucursal porque tiene ${cantidadCitas} cita(s) registrada(s)`);
    }

    await this.sucursalRepository.delete(id);

    return {
      success: true,
      message: 'Sucursal eliminada exitosamente',
    };
  }

  /**
   * Convertir entidad a respuesta
   */
  private toResponse(sucursal: any): SucursalResponse {
    return {
      id: sucursal.id,
      nombre: sucursal.nombre,
      direccion: sucursal.direccion,
      ciudad: sucursal.ciudad,
      provincia: sucursal.provincia,
      telefono: sucursal.telefono,
      email: sucursal.email,
      googleMapsUrl: sucursal.googleMapsUrl,
      estado: sucursal.estado,
      negocioId: sucursal.negocioId,
      createdAt: sucursal.createdAt,
      updatedAt: sucursal.updatedAt,
      horarios: sucursal.horarios?.map((h: any) => ({
        id: h.id,
        diaSemana: h.diaSemana,
        abierto: h.abierto,
        horaApertura: h.horaApertura,
        horaCierre: h.horaCierre,
        tieneDescanso: h.tieneDescanso,
        descansoInicio: h.descansoInicio,
        descansoFin: h.descansoFin
      }))
    };
  }
}
