import { UsuarioRepository } from '../repositories/usuario.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import { hashPassword } from '../utils/password.util';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioResponse,
} from '../models/usuario.model';

export class UsuarioService {
  constructor(
    private usuarioRepository: UsuarioRepository,
    private negocioRepository: NegocioRepository
  ) {}

  async register(dto: CreateUsuarioDto): Promise<UsuarioResponse> {
    const emailExists = await this.usuarioRepository.emailExists(dto.email);
    if (emailExists) {
      throw new Error('El email ya está registrado');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new Error('Email inválido');
    }

    if (dto.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    if (!dto.nombre || dto.nombre.trim().length < 2) {
      throw new Error('El nombre del negocio debe tener al menos 2 caracteres');
    }

    if (!dto.telefono || dto.telefono.trim().length < 7) {
      throw new Error('El teléfono debe tener al menos 7 caracteres');
    }

    const hashedPassword = await hashPassword(dto.password);

    try {
      const usuario = await this.usuarioRepository.create({
        email: dto.email,
        password: hashedPassword,
      });

      await this.negocioRepository.create({
        nombre: dto.nombre.trim(),
        telefono: dto.telefono.trim(),
        logo: dto.logo,
        descripcion: dto.descripcion?.trim(),
        usuarioId: usuario.id,
      });

      const usuarioCompleto = await this.usuarioRepository.findById(usuario.id);

      if (!usuarioCompleto || !usuarioCompleto.negocio) {
        throw new Error('Error al crear usuario y negocio');
      }

      return this.toResponse(usuarioCompleto);
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      throw new Error(error.message || 'Error al registrar usuario y negocio');
    }
  }

  async getProfile(userId: string): Promise<UsuarioResponse> {
    const usuario = await this.usuarioRepository.findById(userId);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    return this.toResponse(usuario);
  }

  async updateProfile(userId: string, dto: UpdateUsuarioDto): Promise<UsuarioResponse> {
    const usuario = await this.usuarioRepository.findById(userId);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    if (dto.email && dto.email !== usuario.email) {
      const emailExists = await this.usuarioRepository.emailExists(dto.email);
      if (emailExists) {
        throw new Error('El email ya está registrado');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new Error('Email inválido');
      }
    }

    const updateData: any = {};

    if (dto.email) {
      updateData.email = dto.email;
    }

    if (dto.password) {
      if (dto.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      updateData.password = await hashPassword(dto.password);
    }

    await this.usuarioRepository.update(userId, updateData);

    if (dto.nombre || dto.telefono) {
      if (usuario.negocio) {
        await this.negocioRepository.update(usuario.negocio.id, {
          nombre: dto.nombre,
          telefono: dto.telefono,
        });
      }
    }

    const usuarioCompleto = await this.usuarioRepository.findById(userId);

    if (!usuarioCompleto) {
      throw new Error('Error al actualizar usuario');
    }

    return this.toResponse(usuarioCompleto);
  }

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
