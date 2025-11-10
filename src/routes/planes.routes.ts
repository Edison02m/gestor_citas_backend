// src/routes/planes.routes.ts

import { FastifyInstance } from 'fastify';
import { PlanesController } from '../controllers/planes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export async function planesRoutes(fastify: FastifyInstance) {
  const planesController = new PlanesController();

  // Obtener planes disponibles (no requiere auth - página de pricing pública)
  fastify.get(
    '/planes',
    planesController.obtenerPlanesDisponibles.bind(planesController)
  );

  // Rutas que requieren autenticación
  fastify.register(async (authenticatedRoutes) => {
    authenticatedRoutes.addHook('preHandler', authMiddleware);

    // Obtener plan actual del negocio
    authenticatedRoutes.get(
      '/negocio/plan-actual',
      planesController.obtenerPlanActual.bind(planesController)
    );

    // Obtener resumen de uso de recursos
    authenticatedRoutes.get(
      '/negocio/uso',
      planesController.obtenerResumenUso.bind(planesController)
    );

    // Obtener historial de uso
    authenticatedRoutes.get(
      '/negocio/uso/historial',
      planesController.obtenerHistorialUso.bind(planesController)
    );

    // Obtener uso actual del mes
    authenticatedRoutes.get(
      '/negocio/uso/actual',
      planesController.obtenerUsoActual.bind(planesController)
    );

    // Cambiar plan de suscripción
    authenticatedRoutes.post(
      '/suscripcion/cambiar-plan',
      planesController.cambiarPlan.bind(planesController)
    );
  });
}
