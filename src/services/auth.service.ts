import { PrismaClient } from '@prisma/client';
import { SuperAdminRepository } from '../repositories/superadmin.repository';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { comparePassword, hashPassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { SuscripcionVerificationService } from './suscripcion-verification.service';
import { emailService } from '../emails/EmailService';
import * as crypto from 'crypto';

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

  async login(dto: LoginDto): Promise<LoginResponse> {
    const { email, password } = dto;

    const superAdmin = await this.superAdminRepository.findByEmail(email);

    if (superAdmin) {
      if (!superAdmin.activo) {
        throw new Error('Usuario inactivo. Contacte al administrador.');
      }

      const isPasswordValid = await comparePassword(password, superAdmin.password);

      if (!isPasswordValid) {
        throw new Error('Credenciales inválidas');
      }

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

    let usuario = await this.usuarioRepository.findByEmail(email);

    if (!usuario) {
      throw new Error('Credenciales inválidas');
    }

    if (!usuario.activo) {
      throw new Error('Usuario inactivo. Contacte al administrador.');
    }

    const isPasswordValid = await comparePassword(password, usuario.password);

    if (!isPasswordValid) {
      throw new Error('Credenciales inválidas');
    }

    const token = generateToken({
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });

    let estadoSuscripcionActual = usuario.negocio?.estadoSuscripcion;
    let diasRestantes: number | null = null;
    let fechaVencimiento: Date | null = null;

    if (usuario.negocio) {
      const verificacion = await this.suscripcionVerification.verificarYActualizarSuscripcion(
        usuario.negocio.id
      );
      estadoSuscripcionActual = verificacion.estadoActual;
      diasRestantes = verificacion.diasRestantes;
      fechaVencimiento = verificacion.fechaVencimiento;

      if (verificacion.cambioEstado) {
        const usuarioActualizado = await this.usuarioRepository.findById(usuario.id);
        if (usuarioActualizado) {
          usuario = usuarioActualizado;
        }
      }
    }

    // Requiere código si no tiene suscripción activa (sin importar si es primer login o no)
    // Los usuarios nuevos ya tienen prueba automática, así que esto aplica solo para usuarios
    // cuya suscripción expiró o nunca activaron una después de la prueba
    const requiereCodigoActivacion =
      estadoSuscripcionActual === 'SIN_SUSCRIPCION' || estadoSuscripcionActual === 'VENCIDA';

    return {
      success: true,
      data: {
        token,
        user: {
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
                estadoSuscripcion: estadoSuscripcionActual || usuario.negocio.estadoSuscripcion,
                fechaVencimiento: fechaVencimiento,
                diasRestantes,
              }
            : undefined,
        },
        requiereCodigoActivacion,
      },
      message: 'Login exitoso',
    };
  }

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

      let estadoSuscripcionActual = usuario.negocio?.estadoSuscripcion;
      let diasRestantes: number | null = null;
      let fechaVencimiento: Date | null = null;

      if (usuario.negocio) {
        const verificacion = await this.suscripcionVerification.verificarYActualizarSuscripcion(
          usuario.negocio.id
        );
        estadoSuscripcionActual = verificacion.estadoActual;
        diasRestantes = verificacion.diasRestantes;
        fechaVencimiento = verificacion.fechaVencimiento;

        if (verificacion.cambioEstado) {
          const usuarioActualizado = await this.usuarioRepository.findById(usuario.id);
          if (usuarioActualizado) {
            usuario = usuarioActualizado;
          }
        }
      }

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
              estadoSuscripcion: estadoSuscripcionActual || usuario.negocio.estadoSuscripcion,
              fechaVencimiento: fechaVencimiento,
              diasRestantes,
            }
          : undefined,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt,
      };
    }
  }

  /**
   * Solicita la recuperación de contraseña
   * Genera un token y envía email al usuario
   */
  async solicitarRecuperacionPassword(email: string): Promise<{ success: boolean; message: string }> {
    // Buscar usuario por email
    const usuario = await this.usuarioRepository.findByEmail(email);

    if (!usuario) {
      // Por seguridad, no revelamos si el email existe o no
      return {
        success: true,
        message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña',
      };
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');

    // Expiración en 1 hora
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalidar tokens anteriores del usuario
    await this.prisma.passwordResetToken.updateMany({
      where: {
        usuarioId: usuario.id,
        usado: false,
      },
      data: {
        usado: true,
      },
    });

    // Crear nuevo token en BD
    await this.prisma.passwordResetToken.create({
      data: {
        token,
        usuarioId: usuario.id,
        expiresAt,
      },
    });

    // Construir URL de recuperación
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/restablecer-contrasena/${token}`;

    // Enviar email
    const emailResult = await emailService.enviarRecuperacionPassword({
      emailDestinatario: usuario.email,
      nombreUsuario: usuario.nombre,
      resetUrl,
      expirationMinutes: 60,
    });

    if (!emailResult.success) {
      console.error('Error al enviar email de recuperación:', emailResult.error);
    }

    return {
      success: true,
      message: 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña',
    };
  }

  /**
   * Restablece la contraseña del usuario usando el token
   */
  async restablecerPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Buscar token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { usuario: true },
    });

    if (!resetToken) {
      throw new Error('Token inválido o expirado');
    }

    // Validar que no esté usado
    if (resetToken.usado) {
      throw new Error('Este token ya fue utilizado');
    }

    // Validar que no esté expirado
    if (new Date() > resetToken.expiresAt) {
      throw new Error('Token expirado. Solicita uno nuevo');
    }

    // Hashear nueva contraseña
    const hashedPassword = await hashPassword(newPassword);

    // Actualizar contraseña del usuario
    await this.prisma.usuario.update({
      where: { id: resetToken.usuarioId },
      data: { password: hashedPassword },
    });

    // Marcar token como usado
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usado: true },
    });

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
    };
  }
}
