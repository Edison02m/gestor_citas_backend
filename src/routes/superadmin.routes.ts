import { FastifyInstance } from 'fastify';
import { SuperAdminController } from '../controllers/superadmin.controller';
import { SuperAdminService } from '../services/superadmin.service';
import { superAdminMiddleware } from '../middlewares/auth.middleware';

export async function superAdminRoutes(fastify: FastifyInstance) {
  // ✅ Dependency Injection - Una sola instancia por aplicación
  const service = new SuperAdminService();
  const controller = new SuperAdminController(service);

  // Todas las rutas requieren autenticación como SUPER_ADMIN
  const options = {
    preHandler: [superAdminMiddleware]
  };

  // CRUD de Super Admins
  fastify.get('/', options, controller.getAll as any);
  fastify.get('/:id', options, controller.getById as any);
  fastify.post('/', options, controller.create as any);
  fastify.put('/:id', options, controller.update as any);
  fastify.delete('/:id', options, controller.delete as any);
  
  // Activar/Desactivar
  fastify.patch('/:id/toggle-active', options, controller.toggleActive as any);
}
