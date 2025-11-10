import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtUtil, JwtPayload } from '../utils/jwt.util';

// Extender el tipo de Request para incluir el user
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * Middleware que valida el token JWT
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Obtener token del header Authorization
    const authHeader = request.headers.authorization;
    const token = JwtUtil.extractFromHeader(authHeader);

    if (!token) {
      return reply.status(401).send({
        error: 'No autorizado',
        message: 'Token no proporcionado'
      });
    }

    // Verificar y decodificar token
    const decoded = JwtUtil.verify(token);

    // Agregar usuario al request
    request.user = decoded;

    // Si es ADMIN_NEGOCIO, buscar su negocio
    if (decoded.rol === 'ADMIN_NEGOCIO') {
      const prisma = (await import('../database/prisma')).default;
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.userId },
        include: { negocio: { select: { id: true } } },
      });

      if (usuario?.negocio) {
        (request.user as any).negocioId = usuario.negocio.id;
      }
    }

  } catch (error: any) {
    return reply.status(401).send({
      error: 'No autorizado',
      message: error.message || 'Token inválido'
    });
  }
}

/**
 * Middleware que valida que el usuario sea SUPER_ADMIN
 */
export async function superAdminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Primero ejecutar el authMiddleware
  await authMiddleware(request, reply);

  // Si ya se envió una respuesta de error, no continuar
  if (reply.sent) {
    return;
  }

  // Verificar que sea SUPER_ADMIN
  if (request.user?.rol !== 'SUPER_ADMIN') {
    return reply.status(403).send({
      error: 'Acceso denegado',
      message: 'Se requieren privilegios de Super Admin'
    });
  }
}

/**
 * Middleware que valida que el usuario sea ADMIN_NEGOCIO
 */
export async function adminNegocioMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Primero ejecutar el authMiddleware
  await authMiddleware(request, reply);

  // Si ya se envió una respuesta de error, no continuar
  if (reply.sent) {
    return;
  }

  // Verificar que sea ADMIN_NEGOCIO
  if (request.user?.rol !== 'ADMIN_NEGOCIO') {
    return reply.status(403).send({
      error: 'Acceso denegado',
      message: 'Se requieren privilegios de Admin de Negocio'
    });
  }
}
