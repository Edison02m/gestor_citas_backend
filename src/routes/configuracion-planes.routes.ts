// src/routes/configuracion-planes.routes.ts

import { FastifyInstance } from 'fastify';
import configuracionPlanesController from '../controllers/configuracion-planes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

/**
 * Rutas para gestión de configuración de planes
 * Solo accesibles por Super Admins
 */
export async function configuracionPlanesRoutes(app: FastifyInstance) {
  // Middleware de autenticación + verificación de Super Admin
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', async (request, reply) => {
    const user = (request as any).user;
    
    // Verificar que sea Super Admin
    if (user.rol !== 'SUPER_ADMIN') {
      return reply.status(403).send({
        success: false,
        message: 'Acceso denegado. Solo Super Admins pueden acceder a esta ruta.',
      });
    }
  });

  // GET /api/super-admin/planes/configuracion
  app.get(
    '/configuracion',
    configuracionPlanesController.obtenerConfiguracionPlanes.bind(configuracionPlanesController)
  );

  // GET /api/super-admin/planes/configuracion/:planId
  app.get(
    '/configuracion/:planId',
    configuracionPlanesController.obtenerConfiguracionPlan.bind(configuracionPlanesController)
  );

  // PUT /api/super-admin/planes/configuracion/:planId
  app.put(
    '/configuracion/:planId',
    configuracionPlanesController.actualizarConfiguracionPlan.bind(configuracionPlanesController)
  );

  // GET /api/super-admin/planes/estadisticas
  app.get(
    '/estadisticas',
    configuracionPlanesController.obtenerEstadisticasPlanes.bind(configuracionPlanesController)
  );
}
