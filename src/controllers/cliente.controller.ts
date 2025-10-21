// src/controllers/cliente.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { ClienteService } from '../services/cliente.service';
import { ClienteDto, ClienteUpdateDto } from '../models/cliente.model';

interface QueryParams {
  pagina?: string;
  limite?: string;
}

export class ClienteController {
  constructor(private service: ClienteService) {}

  /**
   * GET /api/clientes
   * Listar todos los clientes del negocio
   */
  listar = async (request: FastifyRequest<{ Querystring: QueryParams }>, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;

      const pagina = parseInt(request.query.pagina || '1', 10);
      const limite = parseInt(request.query.limite || '50', 10);

      const result = await this.service.listarClientes(negocioId, pagina, limite);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al listar clientes',
      });
    }
  };

  /**
   * POST /api/clientes
   * Crear un nuevo cliente
   */
  crear = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as ClienteDto;

      const cliente = await this.service.crearCliente(negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: cliente,
        message: 'Cliente creado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear cliente',
      });
    }
  };

  /**
   * PUT /api/clientes/:id
   * Actualizar un cliente
   */
  actualizar = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;
      const dto = request.body as ClienteUpdateDto;

      const cliente = await this.service.actualizarCliente(id, negocioId, dto);

      return reply.status(200).send({
        success: true,
        data: cliente,
        message: 'Cliente actualizado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al actualizar cliente',
      });
    }
  };

  /**
   * DELETE /api/clientes/:id
   * Eliminar un cliente
   */
  eliminar = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const { id } = request.params;

      const result = await this.service.eliminarCliente(id, negocioId);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al eliminar cliente',
      });
    }
  };
}
