import { FastifyRequest, FastifyReply } from 'fastify';
import { SuperAdminService } from '../services/superadmin.service';
import { CreateSuperAdminDto } from '../models/superadmin.model';

export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  create = async (
    request: FastifyRequest<{ Body: CreateSuperAdminDto }>,
    reply: FastifyReply
  ) => {
    try {
      const result = await this.service.create(request.body);
      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Super Admin creado exitosamente'
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear Super Admin'
      });
    }
  };
}
