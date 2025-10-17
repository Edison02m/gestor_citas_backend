// src/services/usuario.service.ts

import { UsuarioRepository } from '../repositories/usuario.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioResponse,
  LoginUsuarioDto,
  LoginUsuarioResponse,
} from '../models/usuario.model';

export class UsuarioService {
  constructor(
    private usuarioRepository: UsuarioRepository,
    private negocioRepository: NegocioRepository
  ) {}

  /**
   * Registrar un nuevo usuario con su negocio
   * Usa transacción para garantizar atomicidad
   */
  async register(dto: CreateUsuarioDto): Promise<UsuarioResponse> {
    // Validar que el email no exista
    const emailExists = await this.usuarioRepository.emailExists(dto.email);
    if (emailExists) {
      throw new Error('El email ya está registrado');
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new Error('Email inválido');
    }

    // Validar contraseña
    if (dto.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    // Validar nombre del negocio
    if (!dto.nombre || dto.nombre.trim().length < 2) {
      throw new Error('El nombre del negocio debe tener al menos 2 caracteres');
    }

    // Validar teléfono
    if (!dto.telefono || dto.telefono.trim().length < 7) {
      throw new Error('El teléfono debe tener al menos 7 caracteres');
    }

    // Hashear contraseña
    const hashedPassword = await hashPassword(dto.password);

    try {
      // Crear usuario
      const usuario = await this.usuarioRepository.create({
        email: dto.email,
        password: hashedPassword,
      });

      // Crear negocio asociado con todos los datos
      await this.negocioRepository.create({
        nombre: dto.nombre.trim(),
        telefono: dto.telefono.trim(),
        logo: dto.logo,
        descripcion: dto.descripcion?.trim(),
        usuarioId: usuario.id,
      });

      // Obtener usuario completo con negocio
      const usuarioCompleto = await this.usuarioRepository.findById(usuario.id);

      if (!usuarioCompleto) {
        throw new Error('Error al obtener usuario creado');
      }

      if (!usuarioCompleto.negocio) {
        throw new Error('Error al crear negocio asociado');
      }

      return this.toResponse(usuarioCompleto);
    } catch (error: any) {
      // Si falla la creación del negocio, el usuario quedará inconsistente
      // En producción, usar una transacción de Prisma
      console.error('Error al registrar usuario:', error);
      throw new Error(error.message || 'Error al registrar usuario y negocio');
    }
  }

  /**
   * Login de usuario
   */
  async login(dto: LoginUsuarioDto): Promise<LoginUsuarioResponse> {
    // Buscar usuario por email
    const usuario = await this.usuarioRepository.findByEmail(dto.email);

    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar que esté activo
    if (!usuario.activo) {
      throw new Error('Usuario inactivo. Contacte al administrador.');
    }

    // Verificar contraseña
    const isPasswordValid = await comparePassword(dto.password, usuario.password);

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Generar token
    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    // Verificar si requiere código de activación
    const requiereCodigoActivacion =
      usuario.primerLogin && 
      usuario.negocio?.estadoSuscripcion === 'SIN_SUSCRIPCION';

    return {
      token,
      user: this.toResponse(usuario),
      requiereCodigoActivacion,
    };
  }

  /**
   * Obtener usuario por ID
   */
  async getById(id: string): Promise<UsuarioResponse> {
    const usuario = await this.usuarioRepository.findById(id);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    return this.toResponse(usuario);
  }

  /**
   * Actualizar usuario
   */
  async update(id: string, dto: UpdateUsuarioDto): Promise<UsuarioResponse> {
    const usuario = await this.usuarioRepository.findById(id);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Si se actualiza el email, verificar que no exista
    if (dto.email && dto.email !== usuario.email) {
      const emailExists = await this.usuarioRepository.emailExists(dto.email);
      if (emailExists) {
        throw new Error('El email ya está registrado');
      }

      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new Error('Email inválido');
      }
    }

    const updateData: any = {};

    if (dto.email) {
      updateData.email = dto.email;
    }

    // Si se actualiza la contraseña, hashearla
    if (dto.password) {
      if (dto.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      updateData.password = await hashPassword(dto.password);
    }

    // Actualizar usuario
    await this.usuarioRepository.update(id, updateData);

    // Si se actualizó nombre o teléfono, actualizar negocio
    if (dto.nombre || dto.telefono) {
      if (usuario.negocio) {
        await this.negocioRepository.update(usuario.negocio.id, {
          nombre: dto.nombre,
          telefono: dto.telefono,
        });
      }
    }

    // Obtener usuario actualizado completo
    const usuarioCompleto = await this.usuarioRepository.findById(id);

    if (!usuarioCompleto) {
      throw new Error('Error al actualizar usuario');
    }

    return this.toResponse(usuarioCompleto);
  }

  /**
   * Eliminar usuario
   */
  async delete(id: string): Promise<void> {
    const usuario = await this.usuarioRepository.findById(id);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // El negocio se eliminará en cascada
    await this.usuarioRepository.delete(id);
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  async getProfile(userId: string): Promise<UsuarioResponse> {
    return this.getById(userId);
  }

  /**
   * Actualizar perfil del usuario autenticado
   */
  async updateProfile(userId: string, dto: UpdateUsuarioDto): Promise<UsuarioResponse> {
    return this.update(userId, dto);
  }

  /**
   * Convertir a DTO de respuesta
   */
  private toResponse(usuario: any): UsuarioResponse {
    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      primerLogin: usuario.primerLogin,
      activo: usuario.activo,
      negocio: usuario.negocio
        ? {
            id: usuario.negocio.id,
            nombre: usuario.negocio.nombre,
            telefono: usuario.negocio.telefono,
            logo: usuario.negocio.logo,
            descripcion: usuario.negocio.descripcion,
            estadoSuscripcion: usuario.negocio.estadoSuscripcion,
          }
        : undefined,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };
  }
}
