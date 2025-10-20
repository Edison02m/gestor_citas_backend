// src/routes/onboarding.routes.ts

import { FastifyInstance } from 'fastify';
import { OnboardingService } from '../services/onboarding.service';
import { OnboardingController } from '../controllers/onboarding.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../database/prisma';

export async function onboardingRoutes(fastify: FastifyInstance) {
  const onboardingService = new OnboardingService(prisma);
  const onboardingController = new OnboardingController(onboardingService);

  // Todas las rutas requieren autenticación
  fastify.addHook('preHandler', authMiddleware);

  // Obtener estado del onboarding
  fastify.get('/status', onboardingController.getStatus);

  // Paso 2: Crear sucursal
  fastify.post('/sucursales', onboardingController.crearSucursal);

  // Paso 3: Crear servicio
  fastify.post('/servicios', onboardingController.crearServicio);

  // Paso 4: Crear empleado (OPCIONAL)
  fastify.post('/empleados', onboardingController.crearEmpleado);

  // Paso 5: Completar onboarding
  fastify.post('/completar', onboardingController.completar);

  // BATCH: Configuración completa
  fastify.post('/completo', onboardingController.configuracionCompleta);
}
