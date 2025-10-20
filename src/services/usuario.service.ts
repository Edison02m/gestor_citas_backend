import { UsuarioRepository } from '../repositories/usuario.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import { PrismaClient, PlanSuscripcion } from '@prisma/client';
import { hashPassword } from '../utils/password.util';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioResponse,
} from '../models/usuario.model';

export class UsuarioService {
  constructor(
    private usuarioRepository: UsuarioRepository,
    private negocioRepository: NegocioRepository,
    private prisma: PrismaClient
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
      throw new Error('El nombre del usuario debe tener al menos 2 caracteres');
    }

    if (!dto.nombreNegocio || dto.nombreNegocio.trim().length < 2) {
      throw new Error('El nombre del negocio debe tener al menos 2 caracteres');
    }

    if (!dto.telefono || dto.telefono.trim().length < 7) {
      throw new Error('El teléfono debe tener al menos 7 caracteres');
    }

    const hashedPassword = await hashPassword(dto.password);

    try {
      // Crear usuario, negocio y suscripción de prueba en una transacción
      const resultado = await this.prisma.$transaction(async (tx) => {
        // 1. Crear el usuario
        const usuario = await tx.usuario.create({
          data: {
            nombre: dto.nombre.trim(),
            email: dto.email,
            password: hashedPassword,
          },
        });

        // 2. Crear el negocio
        const negocio = await tx.negocio.create({
          data: {
            nombre: dto.nombreNegocio.trim(),
            telefono: dto.telefono.trim(),
            logo: dto.logo,
            descripcion: dto.descripcion?.trim(),
            usuarioId: usuario.id,
            estadoSuscripcion: 'ACTIVA', // Inicia con suscripción activa
            codigoAplicado: true, // Ya tiene código aplicado (prueba automática)
          },
        });

        // 3. Crear código de suscripción de prueba automático
        const codigoPrueba = await tx.codigoSuscripcion.create({
          data: {
            codigo: `PRUEBA-${Date.now()}-${usuario.id.substring(0, 8)}`,
            plan: PlanSuscripcion.PRUEBA,
            duracionMeses: 1, // 30 días = 1 mes
            descripcion: 'Período de prueba gratuito de 30 días',
            precio: 0,
            usado: true,
            fechaUso: new Date(),
            vecesUsado: 1,
            motivoCreacion: 'Registro automático con período de prueba',
            notas: `Generado automáticamente para ${dto.email}`,
          },
        });

        // 4. Crear la suscripción activa
        const fechaActivacion = new Date();
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30); // 30 días desde hoy

        const suscripcion = await tx.suscripcion.create({
          data: {
            negocioId: negocio.id,
            codigoId: codigoPrueba.id,
            fechaActivacion,
            fechaVencimiento,
            activa: true,
            renovacionAuto: false,
          },
        });

        // 5. Registrar en historial - REGISTRO
        await tx.historialSuscripcion.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'REGISTRO',
            descripcion: `Nuevo negocio registrado: ${dto.nombreNegocio}. Usuario: ${dto.email}`,
            codigoUsado: null,
            realizadoPor: usuario.id,
            metadata: {
              nombreNegocio: dto.nombreNegocio,
              emailUsuario: dto.email,
              nombreUsuario: dto.nombre,
            },
          },
        });

        // 6. Registrar en historial - ACTIVACION AUTOMÁTICA
        await tx.historialSuscripcion.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'ACTIVACION_CODIGO',
            descripcion: `Período de prueba de 30 días activado automáticamente. Vence el ${fechaVencimiento.toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`,
            codigoUsado: codigoPrueba.codigo,
            realizadoPor: usuario.id,
            metadata: {
              tipoActivacion: 'automatica',
              duracionDias: 30,
              emailUsuario: dto.email,
              fechaInicio: fechaActivacion.toISOString(),
              fechaFin: fechaVencimiento.toISOString(),
            },
          },
        });

        // 7. NO cambiar primerLogin aquí - se cambiará cuando complete el onboarding
        // El usuario tiene suscripción activa pero aún debe configurar su negocio
        
        return usuario;
      });

      // Obtener el usuario completo con toda la información
      const usuarioCompleto = await this.usuarioRepository.findById(resultado.id);

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

    if (dto.nombre) {
      updateData.nombre = dto.nombre;
    }

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

    if (dto.nombreNegocio || dto.telefono) {
      if (usuario.negocio) {
        await this.negocioRepository.update(usuario.negocio.id, {
          nombre: dto.nombreNegocio,
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
      nombre: usuario.nombre,
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
