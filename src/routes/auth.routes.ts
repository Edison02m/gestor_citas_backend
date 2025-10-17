// src/routes/auth.routes.ts
// Rutas de autenticación UNIFICADAS para SuperAdmin y Usuarios

import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../database/prisma';

export async function authRoutes(fastify: FastifyInstance) {
  // ✅ Dependency Injection - Una sola instancia por aplicación
  const service = new AuthService(prisma);
  const controller = new AuthController(service);

  // Rutas públicas (sin autenticación)
  fastify.post('/login', controller.login);

  // Rutas protegidas (requieren autenticación)
  fastify.get('/me', {
    preHandler: [authMiddleware]
  }, controller.getMe);
}
