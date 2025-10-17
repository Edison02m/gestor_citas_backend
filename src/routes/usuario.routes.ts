// src/routes/usuario.routes.ts

import { FastifyInstance } from 'fastify';
import { UsuarioRepository } from '../repositories/usuario.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import { UsuarioService } from '../services/usuario.service';
import { UsuarioController } from '../controllers/usuario.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import prisma from '../database/prisma';

export async function usuarioRoutes(fastify: FastifyInstance) {
  // ✅ Usar singleton de PrismaClient
  const usuarioRepository = new UsuarioRepository(prisma);
  const negocioRepository = new NegocioRepository(prisma);
  const usuarioService = new UsuarioService(usuarioRepository, negocioRepository);
  const usuarioController = new UsuarioController(usuarioService);

  // Rutas públicas (sin autenticación)
  fastify.post('/register', usuarioController.register);
  // NOTA: El login ahora está en /api/auth/login (unificado)

  // Rutas protegidas (requieren solo autenticación, NO verifican suscripción)
  // Estas rutas permiten ver/editar perfil incluso sin suscripción activa
  fastify.get(
    '/profile',
    { preHandler: [authMiddleware] },
    usuarioController.getProfile
  );

  fastify.put(
    '/profile',
    { preHandler: [authMiddleware] },
    usuarioController.updateProfile
  );

  // Rutas de administración (solo para testing o super admin)
  fastify.get(
    '/:id',
    { preHandler: [authMiddleware] },
    usuarioController.getById
  );

  fastify.put(
    '/:id',
    { preHandler: [authMiddleware] },
    usuarioController.update
  );

  fastify.delete(
    '/:id',
    { preHandler: [authMiddleware] },
    usuarioController.delete
  );
}
