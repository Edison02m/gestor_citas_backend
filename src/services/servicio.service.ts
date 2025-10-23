// src/services/servicio.service.ts

import { PrismaClient } from '@prisma/client';
import { ServicioRepository } from '../repositories/servicio.repository';
import {
  ServicioResponse,
  ServicioDto,
  ServicioUpdateDto,
  AsignarSucursalesDto
} from '../models/servicio.model';

export class ServicioService {
  private servicioRepository: ServicioRepository;

  constructor(private prisma: PrismaClient) {
    this.servicioRepository = new ServicioRepository(this.prisma);
  }

  /**
   * Listar todos los servicios del negocio
   */
  async obtenerServicios(negocioId: string): Promise<ServicioResponse[]> {
    const servicios = await this.servicioRepository.findByNegocioId(negocioId);
    return servicios.map(this.toResponse);
  }

  /**
   * Obtener un servicio por ID
   */
  async obtenerServicioPorId(id: string, negocioId: string): Promise<ServicioResponse> {
    const servicio = await this.servicioRepository.findById(id);

    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }

    // Verificar que el servicio pertenece al negocio
    if (servicio.negocioId !== negocioId) {
      throw new Error('No tienes permisos para acceder a este servicio');
    }

    return this.toResponse(servicio);
  }

  /**
   * Crear un nuevo servicio
   */
  async crearServicio(negocioId: string, dto: ServicioDto): Promise<ServicioResponse> {
    // Validar campos requeridos
    if (!dto.nombre || dto.nombre.trim() === '') {
      throw new Error('El nombre del servicio es requerido');
    }

    if (!dto.descripcion || dto.descripcion.trim() === '') {
      throw new Error('La descripción es requerida');
    }

    if (!dto.duracion || dto.duracion <= 0) {
      throw new Error('La duración debe ser mayor a 0 minutos');
    }

    if (dto.precio === undefined || dto.precio < 0) {
      throw new Error('El precio debe ser mayor o igual a 0');
    }

    // Validar que se asigne al menos una sucursal
    if (!dto.sucursales || dto.sucursales.length === 0) {
      throw new Error('Debes asignar el servicio a al menos una sucursal');
    }

    // Validar que las sucursales pertenecen al negocio
    const sucursalesValidas = await this.servicioRepository.validateSucursales(dto.sucursales, negocioId);
    if (!sucursalesValidas) {
      throw new Error('Una o más sucursales no pertenecen a tu negocio');
    }

    // Validar que no exista un servicio con el mismo nombre
    const servicioExistente = await this.servicioRepository.existsByNombre(dto.nombre.trim(), negocioId);
    if (servicioExistente) {
      throw new Error(`Ya existe un servicio con el nombre "${dto.nombre}"`);
    }

    // Crear servicio
    const servicio = await this.servicioRepository.create(negocioId, {
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion.trim(),
      duracion: dto.duracion,
      precio: dto.precio,
      foto: dto.foto?.trim(),
      color: dto.color || '#3b82f6',
      sucursales: dto.sucursales
    });

    return this.toResponse(servicio);
  }

  /**
   * Actualizar un servicio
   */
  async actualizarServicio(id: string, negocioId: string, dto: ServicioUpdateDto): Promise<ServicioResponse> {
    // Verificar que el servicio existe y pertenece al negocio
    const servicioExistente = await this.servicioRepository.findById(id);
    if (!servicioExistente) {
      throw new Error('Servicio no encontrado');
    }

    if (servicioExistente.negocioId !== negocioId) {
      throw new Error('No tienes permisos para actualizar este servicio');
    }

    // Validar nombre si se proporciona
    if (dto.nombre !== undefined) {
      if (!dto.nombre || dto.nombre.trim() === '') {
        throw new Error('El nombre no puede estar vacío');
      }

      // Verificar que no exista otro servicio con el mismo nombre
      const otroServicio = await this.servicioRepository.existsByNombre(dto.nombre.trim(), negocioId, id);
      if (otroServicio) {
        throw new Error(`Ya existe otro servicio con el nombre "${dto.nombre}"`);
      }
    }

    // Validar otros campos
    if (dto.descripcion !== undefined && (!dto.descripcion || dto.descripcion.trim() === '')) {
      throw new Error('La descripción no puede estar vacía');
    }

    if (dto.duracion !== undefined && dto.duracion <= 0) {
      throw new Error('La duración debe ser mayor a 0 minutos');
    }

    if (dto.precio !== undefined && dto.precio < 0) {
      throw new Error('El precio debe ser mayor o igual a 0');
    }

    // Validar estado si se proporciona
    if (dto.estado !== undefined) {
      if (!['ACTIVO', 'INACTIVO'].includes(dto.estado)) {
        throw new Error('El estado debe ser ACTIVO o INACTIVO');
      }
    }

    // Limpiar datos
    const dataLimpia: ServicioUpdateDto = {};
    if (dto.nombre !== undefined) dataLimpia.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined) dataLimpia.descripcion = dto.descripcion.trim();
    if (dto.duracion !== undefined) dataLimpia.duracion = dto.duracion;
    if (dto.precio !== undefined) dataLimpia.precio = dto.precio;
    if (dto.foto !== undefined) dataLimpia.foto = dto.foto?.trim() || null;
    if (dto.color !== undefined) dataLimpia.color = dto.color;
    if (dto.estado !== undefined) dataLimpia.estado = dto.estado;

    const servicio = await this.servicioRepository.update(id, dataLimpia);
    return this.toResponse(servicio);
  }

  /**
   * Eliminar un servicio
   */
  async eliminarServicio(id: string, negocioId: string) {
    // Verificar que el servicio existe y pertenece al negocio
    const servicioExistente = await this.servicioRepository.findById(id);
    if (!servicioExistente) {
      throw new Error('Servicio no encontrado');
    }

    if (servicioExistente.negocioId !== negocioId) {
      throw new Error('No tienes permisos para eliminar este servicio');
    }

    // Verificar si tiene citas asociadas
    const cantidadCitas = await this.servicioRepository.countCitas(id);
    if (cantidadCitas > 0) {
      throw new Error(`No puedes eliminar este servicio porque tiene ${cantidadCitas} cita(s) registrada(s)`);
    }

    await this.servicioRepository.delete(id);

    return {
      success: true,
      message: 'Servicio eliminado exitosamente',
    };
  }

  /**
   * Asignar sucursales a un servicio
   */
  async asignarSucursales(id: string, negocioId: string, dto: AsignarSucursalesDto): Promise<ServicioResponse> {
    // Verificar que el servicio existe y pertenece al negocio
    const servicioExistente = await this.servicioRepository.findById(id);
    if (!servicioExistente) {
      throw new Error('Servicio no encontrado');
    }

    if (servicioExistente.negocioId !== negocioId) {
      throw new Error('No tienes permisos para modificar este servicio');
    }

    // Validar que se asigne al menos una sucursal
    if (!dto.sucursales || dto.sucursales.length === 0) {
      throw new Error('Debes asignar el servicio a al menos una sucursal');
    }

    // Validar que las sucursales pertenecen al negocio
    const sucursalesValidas = await this.servicioRepository.validateSucursales(dto.sucursales, negocioId);
    if (!sucursalesValidas) {
      throw new Error('Una o más sucursales no pertenecen a tu negocio');
    }

    const servicio = await this.servicioRepository.asignarSucursales(id, dto.sucursales);
    return this.toResponse(servicio);
  }

  /**
   * Actualizar disponibilidad de un servicio en una sucursal
   */
  async actualizarDisponibilidad(
    servicioId: string,
    sucursalId: string,
    negocioId: string,
    disponible: boolean
  ) {
    // Verificar que el servicio existe y pertenece al negocio
    const servicioExistente = await this.servicioRepository.findById(servicioId);
    if (!servicioExistente) {
      throw new Error('Servicio no encontrado');
    }

    if (servicioExistente.negocioId !== negocioId) {
      throw new Error('No tienes permisos para modificar este servicio');
    }

    // Validar que la sucursal pertenece al negocio
    const sucursalesValidas = await this.servicioRepository.validateSucursales([sucursalId], negocioId);
    if (!sucursalesValidas) {
      throw new Error('La sucursal no pertenece a tu negocio');
    }

    await this.servicioRepository.updateDisponibilidadSucursal(servicioId, sucursalId, disponible);

    return {
      success: true,
      message: `Disponibilidad actualizada exitosamente`,
    };
  }

  /**
   * Obtener servicios disponibles en una sucursal
   */
  async obtenerServiciosPorSucursal(sucursalId: string, negocioId: string) {
    // Validar que la sucursal pertenece al negocio
    const sucursalesValidas = await this.servicioRepository.validateSucursales([sucursalId], negocioId);
    if (!sucursalesValidas) {
      throw new Error('La sucursal no pertenece a tu negocio');
    }

    const servicios = await this.servicioRepository.findBySucursalId(sucursalId, negocioId);
    return servicios.map(s => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion,
      duracion: s.duracion,
      precio: s.precio.toNumber(),
      foto: s.foto,
      estado: s.estado
    }));
  }

  /**
   * Convertir entidad a respuesta
   */
  private toResponse(servicio: any): ServicioResponse {
    return {
      id: servicio.id,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      duracion: servicio.duracion,
      precio: servicio.precio.toNumber(),
      foto: servicio.foto,
      color: servicio.color,
      estado: servicio.estado,
      negocioId: servicio.negocioId,
      createdAt: servicio.createdAt,
      updatedAt: servicio.updatedAt,
      sucursales: servicio.sucursales?.map((ss: any) => ({
        sucursalId: ss.sucursalId,
        disponible: ss.disponible,
        asignadoEn: ss.asignadoEn,
        sucursal: ss.sucursal ? {
          id: ss.sucursal.id,
          nombre: ss.sucursal.nombre,
          direccion: ss.sucursal.direccion,
          ciudad: ss.sucursal.ciudad,
          estado: ss.sucursal.estado
        } : undefined
      }))
    };
  }
}
