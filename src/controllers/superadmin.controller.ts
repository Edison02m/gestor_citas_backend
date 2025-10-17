import { FastifyRequest, FastifyReply } from 'fastify';
import { SuperAdminService } from '../services/superadmin.service';
import {
  CreateSuperAdminDto,
  UpdateSuperAdminDto,
  LoginDto
} from '../models/superadmin.model';

export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  /**
   * POST /api/auth/login - Login de Super Admin
   */
  login = async (
    request: FastifyRequest<{ Body: LoginDto }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await this.service.login(request.body);
      return reply.status(200).send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: 'Error en login',
        message: error.message
      });
    }
  };

  /**
   * GET /api/superadmin - Obtener todos los super admins (con paginación opcional)
   */
  getAll = async (
    request: FastifyRequest<{
      Querystring: { page?: string; limit?: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const page = request.query.page ? parseInt(request.query.page) : undefined;
      const limit = request.query.limit ? parseInt(request.query.limit) : undefined;

      if (page && limit) {
        const result = await this.service.getPaginated(page, limit);
        return reply.status(200).send(result);
      } else {
        const result = await this.service.getAll();
        return reply.status(200).send(result);
      }
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Error al obtener Super Admins',
        message: error.message
      });
    }
  };

  /**
   * GET /api/superadmin/:id - Obtener super admin por ID
   */
  getById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await this.service.getById(request.params.id);
      return reply.status(200).send(result);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 500;
      return reply.status(statusCode).send({
        error: 'Error al obtener Super Admin',
        message: error.message
      });
    }
  };

  /**
   * POST /api/superadmin - Crear un super admin
   */
  create = async (
    request: FastifyRequest<{ Body: CreateSuperAdminDto }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await this.service.create(request.body);
      return reply.status(201).send(result);
    } catch (error: any) {
      return reply.status(400).send({
        error: 'Error al crear Super Admin',
        message: error.message
      });
    }
  };

  /**
   * PUT /api/superadmin/:id - Actualizar super admin
   */
  update = async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateSuperAdminDto;
    }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await this.service.update(request.params.id, request.body);
      return reply.status(200).send(result);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      return reply.status(statusCode).send({
        error: 'Error al actualizar Super Admin',
        message: error.message
      });
    }
  };

  /**
   * DELETE /api/superadmin/:id - Eliminar super admin
   */
  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await this.service.delete(request.params.id);
      return reply.status(200).send(result);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      return reply.status(statusCode).send({
        error: 'Error al eliminar Super Admin',
        message: error.message
      });
    }
  };

  /**
   * PATCH /api/superadmin/:id/toggle-active - Activar/Desactivar super admin
   */
  toggleActive = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await this.service.toggleActive(request.params.id);
      return reply.status(200).send(result);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      return reply.status(statusCode).send({
        error: 'Error al cambiar estado',
        message: error.message
      });
    }
  };

  /**
   * GET /api/auth/me - Obtener información del usuario autenticado
   */
  getMe = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      // El user viene del middleware de autenticación
      if (!request.user) {
        return reply.status(401).send({
          error: 'No autenticado'
        });
      }

      const result = await this.service.getById(request.user.userId);
      return reply.status(200).send(result);
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Error al obtener información del usuario',
        message: error.message
      });
    }
  };
}
