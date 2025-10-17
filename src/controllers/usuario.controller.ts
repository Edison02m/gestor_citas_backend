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

  /**
   * PUT /api/usuarios/profile
   * Actualizar perfil del usuario autenticado
   */
  updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;  // CORREGIDO: userId en lugar de id
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
   * GET /api/usuarios/:id
   * Obtener usuario por ID (solo admin)
   */
  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      const usuario = await this.service.getById(id);

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

  /**
   * PUT /api/usuarios/:id
   * Actualizar usuario (solo admin)
   */
  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const dto = request.body as UpdateUsuarioDto;

      const usuario = await this.service.update(id, dto);

      return reply.status(200).send({
        success: true,
        data: usuario,
        message: 'Usuario actualizado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar usuario',
      });
    }
  };

  /**
   * DELETE /api/usuarios/:id
   * Eliminar usuario (solo admin)
   */
  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      await this.service.delete(id);

      return reply.status(200).send({
        success: true,
        message: 'Usuario eliminado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar usuario',
      });
    }
  };
}
