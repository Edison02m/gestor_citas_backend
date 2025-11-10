// src/controllers/usuario.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { UsuarioService } from '../services/usuario.service';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
} from '../models/usuario.model';

export class UsuarioController {
  constructor(private service: UsuarioService) {}

  /**
   * POST /api/usuarios/register
   * Registrar un nuevo usuario
   */
  register = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dto = request.body as CreateUsuarioDto;

      const usuario = await this.service.register(dto);

      return reply.status(201).send({
        success: true,
        data: usuario,
        message: 'Usuario registrado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al registrar usuario',
      });
    }
  };

  /**
   * GET /api/usuarios/profile
   * Obtener perfil del usuario autenticado
   */
  getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;  // CORREGIDO: userId en lugar de id

      const usuario = await this.service.getProfile(userId);

      return reply.status(200).send({
        success: true,
        data: usuario,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Usuario no encontrado',
      });
    }
  };

  updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const dto = request.body as UpdateUsuarioDto;

      const usuario = await this.service.updateProfile(userId, dto);

      return reply.status(200).send({
        success: true,
        data: usuario,
        message: 'Perfil actualizado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar perfil',
      });
    }
  };

  /**
   * PATCH /api/usuario/perfil
   * Actualizar datos personales del usuario autenticado
   */
  actualizarPerfil = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const usuarioId = (request as any).user.userId;
      const { nombre, email } = request.body as {
        nombre?: string;
        email?: string;
      };

      // Validaciones básicas
      if (nombre && nombre.trim().length < 2) {
        return reply.status(400).send({
          success: false,
          message: 'El nombre debe tener al menos 2 caracteres',
        });
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.status(400).send({
          success: false,
          message: 'El correo electrónico no es válido',
        });
      }

      const resultado = await this.service.actualizarPerfil(usuarioId, {
        nombre,
        email,
      });

      return reply.send(resultado);
    } catch (error: any) {
      console.error('Error en actualizarPerfil:', error);
      
      // Error específico para email duplicado
      if (error.message === 'El correo electrónico ya está en uso') {
        return reply.status(409).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar el perfil',
      });
    }
  };

  /**
   * PATCH /api/usuario/cambiar-password
   * Cambiar contraseña del usuario autenticado
   */
  cambiarPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const usuarioId = (request as any).user.userId;
      const { passwordActual, passwordNueva, passwordNuevaConfirm } = request.body as {
        passwordActual: string;
        passwordNueva: string;
        passwordNuevaConfirm: string;
      };

      // Validaciones
      if (!passwordActual || !passwordNueva || !passwordNuevaConfirm) {
        return reply.status(400).send({
          success: false,
          message: 'Todos los campos son requeridos',
        });
      }

      if (passwordNueva !== passwordNuevaConfirm) {
        return reply.status(400).send({
          success: false,
          message: 'Las contraseñas nuevas no coinciden',
        });
      }

      if (passwordNueva.length < 8) {
        return reply.status(400).send({
          success: false,
          message: 'La nueva contraseña debe tener al menos 8 caracteres',
        });
      }

      // Validar requisitos de seguridad
      const tieneNumero = /\d/.test(passwordNueva);
      const tieneMayuscula = /[A-Z]/.test(passwordNueva);
      
      if (!tieneNumero || !tieneMayuscula) {
        return reply.status(400).send({
          success: false,
          message: 'La contraseña debe contener al menos una mayúscula y un número',
        });
      }

      const resultado = await this.service.cambiarPassword(
        usuarioId,
        passwordActual,
        passwordNueva
      );

      return reply.send(resultado);
    } catch (error: any) {
      console.error('Error en cambiarPassword:', error);
      
      // Manejar error de contraseña incorrecta
      if (error.message.includes('contraseña actual es incorrecta')) {
        return reply.status(401).send({
          success: false,
          message: error.message,
        });
      }

      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al cambiar la contraseña',
      });
    }
  };
}
