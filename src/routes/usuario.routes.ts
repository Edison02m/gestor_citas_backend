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
  const usuarioService = new UsuarioService(usuarioRepository, negocioRepository, prisma);
  const usuarioController = new UsuarioController(usuarioService);

  fastify.post('/register', usuarioController.register);

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

  /**
   * PATCH /api/usuario/perfil
   * Actualizar datos personales del usuario autenticado
   */
  fastify.patch(
    '/perfil',
    { preHandler: [authMiddleware] },
    usuarioController.actualizarPerfil
  );

  /**
   * PATCH /api/usuario/cambiar-password
   * Cambiar contraseña del usuario autenticado
   */
  fastify.patch(
    '/cambiar-password',
    { preHandler: [authMiddleware] },
    usuarioController.cambiarPassword
  );
}
