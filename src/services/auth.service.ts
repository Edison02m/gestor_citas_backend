// src/services/auth.service.ts

import { PrismaClient } from '@prisma/client';
import { SuperAdminRepository } from '../repositories/superadmin.repository';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { SuscripcionVerificationService } from './suscripcion-verification.service';

interface LoginDto {
  email: string;
  password: string;
}

interface LoginResponse {
  success: true;
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      rol: string;
      nombre?: string;
      primerLogin?: boolean;
      activo: boolean;
      negocio?: any;
    };
    requiereCodigoActivacion?: boolean;
  };
  message: string;
}

export class AuthService {
  private superAdminRepository: SuperAdminRepository;
  private usuarioRepository: UsuarioRepository;
  private suscripcionVerification: SuscripcionVerificationService;

  constructor(private prisma: PrismaClient) {
    this.superAdminRepository = new SuperAdminRepository();
    this.usuarioRepository = new UsuarioRepository(this.prisma);
    this.suscripcionVerification = new SuscripcionVerificationService(this.prisma);
  }

  /**
   * Login unificado - Detecta automáticamente si es SuperAdmin o Usuario
   */
  async login(dto: LoginDto): Promise<LoginResponse> {
    const { email, password } = dto;

    // 1. Intentar primero con SuperAdmin
    const superAdmin = await this.superAdminRepository.findByEmail(email);

    if (superAdmin) {
      // Verificar que esté activo
      if (!superAdmin.activo) {
        throw new Error('Usuario inactivo. Contacte al administrador.');
      }

      // Verificar contraseña
      const isPasswordValid = await comparePassword(password, superAdmin.password);

      if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
      }

      // Generar token
      const token = generateToken({
        id: superAdmin.id,
        email: superAdmin.email,
        rol: 'SUPER_ADMIN',
      });

      return {
        success: true,
        data: {
          token,
          user: {
            id: superAdmin.id,
            email: superAdmin.email,
            rol: 'SUPER_ADMIN',
            nombre: superAdmin.nombre,
            activo: superAdmin.activo,
          },
        },
        message: 'Login exitoso',
      };
    }

    // 2. Si no es SuperAdmin, buscar en Usuarios
    let usuario = await this.usuarioRepository.findByEmail(email);

    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar que esté activo
    if (!usuario.activo) {
      throw new Error('Usuario inactivo. Contacte al administrador.');
    }

    // Verificar contraseña
    const isPasswordValid = await comparePassword(password, usuario.password);

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    // Generar token
    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    // VERIFICAR ESTADO DE SUSCRIPCIÓN SI TIENE NEGOCIO
    let estadoSuscripcionActual = usuario.negocio?.estadoSuscripcion;
    let diasRestantes: number | null = null;

    if (usuario.negocio) {
      const verificacion = await this.suscripcionVerification.verificarYActualizarSuscripcion(
        usuario.negocio.id
      );
      estadoSuscripcionActual = verificacion.estadoActual;
      diasRestantes = verificacion.diasRestantes;

      // Si cambió el estado, volver a obtener el usuario actualizado
      if (verificacion.cambioEstado) {
        const usuarioActualizado = await this.usuarioRepository.findById(usuario.id);
        if (usuarioActualizado) {
          usuario = usuarioActualizado;
        }
      }
    }

    // Verificar si requiere código de activación
    const requiereCodigoActivacion =
      usuario.primerLogin && estadoSuscripcionActual === 'SIN_SUSCRIPCION';

    return {
      success: true,
      data: {
        token,
        user: {
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
                estadoSuscripcion: estadoSuscripcionActual || usuario.negocio.estadoSuscripcion,
                fechaVencimiento: usuario.negocio.fechaVencimiento,
                diasRestantes,
              }
            : undefined,
        },
        requiereCodigoActivacion,
      },
      message: 'Login exitoso',
    };
  }

  /**
   * Obtener información del usuario autenticado (Me)
   */
  async getMe(userId: string, userRole: string): Promise<any> {
    if (userRole === 'SUPER_ADMIN') {
      const superAdmin = await this.superAdminRepository.findById(userId);
      if (!superAdmin) {
        throw new Error('SuperAdmin no encontrado');
      }
      return {
        id: superAdmin.id,
        email: superAdmin.email,
        rol: 'SUPER_ADMIN',
        nombre: superAdmin.nombre,
        activo: superAdmin.activo,
        createdAt: superAdmin.createdAt,
        updatedAt: superAdmin.updatedAt,
      };
    } else {
      let usuario = await this.usuarioRepository.findById(userId);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // VERIFICAR ESTADO DE SUSCRIPCIÓN SI TIENE NEGOCIO
      let estadoSuscripcionActual = usuario.negocio?.estadoSuscripcion;
      let diasRestantes: number | null = null;

      if (usuario.negocio) {
        const verificacion = await this.suscripcionVerification.verificarYActualizarSuscripcion(
          usuario.negocio.id
        );
        estadoSuscripcionActual = verificacion.estadoActual;
        diasRestantes = verificacion.diasRestantes;

        // Si cambió el estado, volver a obtener el usuario actualizado
        if (verificacion.cambioEstado) {
          const usuarioActualizado = await this.usuarioRepository.findById(usuario.id);
          if (usuarioActualizado) {
            usuario = usuarioActualizado;
          }
        }
      }

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
              estadoSuscripcion: estadoSuscripcionActual || usuario.negocio.estadoSuscripcion,
              fechaVencimiento: usuario.negocio.fechaVencimiento,
              diasRestantes,
            }
          : undefined,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
      };
    }
  }
}
