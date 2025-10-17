// src/controllers/auth.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';

interface LoginDto {
  email: string;
  password: string;
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
}
