// src/controllers/auth.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';

interface LoginDto {
  email: string;
  password: string;
}

interface ForgotPasswordDto {
  email: string;
}

interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export class AuthController {
  constructor(private readonly service: AuthService) {}

  /**
   * POST /api/auth/login
   * Login unificado para SuperAdmin y Usuarios
   */
  login = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dto = request.body as LoginDto;

      // Validar que se envíen los datos
      if (!dto.email || !dto.password) {
        return reply.status(400).send({
          success: false,
          message: 'Email y contraseña son requeridos',
        });
      }

      const response = await this.service.login(dto);

      return reply.status(200).send(response);
    } catch (error: any) {
      console.error('Error en login:', error);
      return reply.status(401).send({
        success: false,
        message: error.message || 'Error al iniciar sesión',
      });
    }
  };

  /**
   * GET /api/auth/me
   * Obtener información del usuario autenticado
   */
  getMe = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;

      const userData = await this.service.getMe(user.userId, user.rol);

      return reply.status(200).send({
        success: true,
        data: userData,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Usuario no encontrado',
      });
    }
  };

  /**
   * POST /api/auth/forgot-password
   * Solicitar recuperación de contraseña
   */
  forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dto = request.body as ForgotPasswordDto;

      // Validar email
      if (!dto.email) {
        return reply.status(400).send({
          success: false,
          message: 'El email es requerido',
        });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        return reply.status(400).send({
          success: false,
          message: 'Formato de email inválido',
        });
      }

      const response = await this.service.solicitarRecuperacionPassword(dto.email);

      return reply.status(200).send(response);
    } catch (error: any) {
      console.error('Error en forgot password:', error);
      return reply.status(500).send({
        success: false,
        message: 'Error al procesar solicitud',
      });
    }
  };

  /**
   * POST /api/auth/reset-password
   * Restablecer contraseña con token
   */
  resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dto = request.body as ResetPasswordDto;

      // Validar datos
      if (!dto.token || !dto.newPassword) {
        return reply.status(400).send({
          success: false,
          message: 'Token y nueva contraseña son requeridos',
        });
      }

      // Validar longitud de contraseña
      if (dto.newPassword.length < 6) {
        return reply.status(400).send({
          success: false,
          message: 'La contraseña debe tener al menos 6 caracteres',
        });
      }

      const response = await this.service.restablecerPassword(dto.token, dto.newPassword);

      return reply.status(200).send(response);
    } catch (error: any) {
      console.error('Error en reset password:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al restablecer contraseña',
      });
    }
  };
}
