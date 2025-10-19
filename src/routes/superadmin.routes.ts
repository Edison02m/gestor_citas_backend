import { FastifyInstance } from 'fastify';
import { SuperAdminController } from '../controllers/superadmin.controller';
import { SuperAdminService } from '../services/superadmin.service';
import { superAdminMiddleware } from '../middlewares/auth.middleware';

export async function superAdminRoutes(fastify: FastifyInstance) {
  const service = new SuperAdminService();
  const controller = new SuperAdminController(service);

  const options = {
    preHandler: [superAdminMiddleware]
  };

  fastify.post('/', options, controller.create as any);
}
