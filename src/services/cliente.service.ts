// src/services/cliente.service.ts

import { PrismaClient } from '@prisma/client';
import { ClienteRepository } from '../repositories/cliente.repository';
import { ClienteDto, ClienteUpdateDto, ClientesListResponse } from '../models/cliente.model';

export class ClienteService {
  private repository: ClienteRepository;

  constructor(prisma: PrismaClient) {
    this.repository = new ClienteRepository(prisma);
  }

  /**
   * Listar todos los clientes con paginación
   */
  async listarClientes(negocioId: string, pagina: number = 1, limite: number = 50): Promise<ClientesListResponse> {
    return await this.repository.findAll(negocioId, pagina, limite);
  }

  /**
   * Crear un nuevo cliente
   */
  async crearCliente(negocioId: string, dto: ClienteDto) {
    // Validar campos requeridos
    if (!dto.nombre || dto.nombre.trim() === '') {
      throw new Error('El nombre es requerido');
    }

    if (!dto.cedula || dto.cedula.trim() === '') {
      throw new Error('La cédula es requerida');
    }

    if (!dto.telefono || dto.telefono.trim() === '') {
      throw new Error('El teléfono es requerido');
    }

    // Validar formato de cédula (10 dígitos para Ecuador, ajustar según país)
    const cedulaLimpia = dto.cedula.replace(/\s+/g, '');
    if (cedulaLimpia.length !== 10 || !/^\d+$/.test(cedulaLimpia)) {
      throw new Error('La cédula debe tener 10 dígitos numéricos');
    }

    // Validar formato de teléfono (básico)
    const telefonoLimpio = dto.telefono.replace(/\s+/g, '');
    if (telefonoLimpio.length < 7) {
      throw new Error('El teléfono debe tener al menos 7 dígitos');
    }

    // Validar email si se proporciona
    if (dto.email && dto.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new Error('El formato del email no es válido');
      }
    }

    // Verificar que no exista un cliente con la misma cédula en este negocio
    const clienteConCedula = await this.repository.existsByCedula(cedulaLimpia, negocioId);
    if (clienteConCedula) {
      throw new Error(`Ya existe un cliente con la cédula ${dto.cedula} en tu negocio`);
    }

    // Verificar que no exista un cliente con el mismo teléfono en este negocio
    const clienteExistente = await this.repository.existsByTelefono(telefonoLimpio, negocioId);
    if (clienteExistente) {
      throw new Error(`Ya existe un cliente con el teléfono ${dto.telefono} en tu negocio`);
    }

    // Crear cliente
    return await this.repository.create(negocioId, {
      nombre: dto.nombre.trim(),
      cedula: cedulaLimpia,
      telefono: telefonoLimpio,
      email: dto.email?.trim() || undefined,
      notas: dto.notas?.trim() || undefined,
    });
  }

  /**
   * Actualizar un cliente
   */
  async actualizarCliente(id: string, negocioId: string, dto: ClienteUpdateDto) {
    // Verificar que el cliente existe y pertenece al negocio
    const clienteExistente = await this.repository.findById(id, negocioId);
    if (!clienteExistente) {
      throw new Error('Cliente no encontrado');
    }

    // Validar nombre si se proporciona
    if (dto.nombre !== undefined) {
      if (!dto.nombre || dto.nombre.trim() === '') {
        throw new Error('El nombre no puede estar vacío');
      }
    }

    // Validar cédula si se proporciona
    if (dto.cedula !== undefined) {
      if (!dto.cedula || dto.cedula.trim() === '') {
        throw new Error('La cédula no puede estar vacía');
      }

      const cedulaLimpia = dto.cedula.replace(/\s+/g, '');
      if (cedulaLimpia.length !== 10 || !/^\d+$/.test(cedulaLimpia)) {
        throw new Error('La cédula debe tener 10 dígitos numéricos');
      }

      // Verificar que no exista otro cliente con la misma cédula en este negocio
      const clienteConCedula = await this.repository.existsByCedula(cedulaLimpia, negocioId, id);
      if (clienteConCedula) {
        throw new Error(`Ya existe otro cliente con la cédula ${dto.cedula} en tu negocio`);
      }

      dto.cedula = cedulaLimpia;
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

      // Verificar que no exista otro cliente con el mismo teléfono
      const clienteConTelefono = await this.repository.existsByTelefono(telefonoLimpio, negocioId, id);
      if (clienteConTelefono) {
        throw new Error(`Ya existe otro cliente con el teléfono ${dto.telefono}`);
      }

      dto.telefono = telefonoLimpio;
    }

    // Validar email si se proporciona
    if (dto.email !== undefined && dto.email !== null && dto.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new Error('El formato del email no es válido');
      }
      dto.email = dto.email.trim();
    }

    // Limpiar datos
    const dataLimpia: ClienteUpdateDto = {};
    if (dto.nombre !== undefined) dataLimpia.nombre = dto.nombre.trim();
    if (dto.cedula !== undefined) dataLimpia.cedula = dto.cedula;
    if (dto.telefono !== undefined) dataLimpia.telefono = dto.telefono;
    if (dto.email !== undefined) dataLimpia.email = dto.email?.trim() || null;
    if (dto.notas !== undefined) dataLimpia.notas = dto.notas?.trim() || null;

    // Actualizar cliente
    return await this.repository.update(id, dataLimpia);
  }

  /**
   * Eliminar un cliente
   */
  async eliminarCliente(id: string, negocioId: string) {
    // Verificar que el cliente existe y pertenece al negocio
    const clienteExistente = await this.repository.findById(id, negocioId);
    if (!clienteExistente) {
      throw new Error('Cliente no encontrado');
    }

    // Verificar si tiene citas asociadas
    const cantidadCitas = await this.repository.countCitas(id);
    if (cantidadCitas > 0) {
      throw new Error(`No puedes eliminar este cliente porque tiene ${cantidadCitas} cita(s) registrada(s)`);
    }

    // Eliminar cliente
    await this.repository.delete(id);

    return {
      success: true,
      message: 'Cliente eliminado exitosamente',
    };
  }
}
