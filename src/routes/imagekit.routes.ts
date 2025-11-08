// src/routes/imagekit.routes.ts
import { FastifyInstance } from 'fastify';
import { imagekitController } from '../controllers/imagekit.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

/**
 * Rutas para ImageKit
 * 
 * Endpoints disponibles:
 * - GET  /api/imagekit/auth        - Obtener parámetros de autenticación para upload desde cliente
 * - POST /api/imagekit/upload      - Upload directo desde servidor (casos especiales)
 * - DELETE /api/imagekit/file/:id  - Eliminar archivo de ImageKit
 */
export async function imagekitRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/imagekit/auth
   * Genera parámetros de autenticación para upload seguro desde cliente
   * 
   * Response:
   * {
   *   success: true,
   *   data: {
   *     token: string,
   *     expire: number,
   *     signature: string,
   *     publicKey: string,
   *     urlEndpoint: string
   *   }
   * }
   */
  fastify.get('/auth', async (request, reply) => {
    return imagekitController.getAuthParameters(request, reply);
  });

  /**
   * POST /api/imagekit/upload
   * Upload directo desde servidor (solo para casos especiales)
   * Requiere autenticación JWT
   * 
   * Body:
   * {
   *   file: string (base64 o URL),
   *   fileName: string,
   *   folder?: string,
   *   tags?: string[]
   * }
   * 
   * Response:
   * {
   *   success: true,
   *   data: {
   *     url: string,
   *     fileId: string,
   *     thumbnailUrl: string,
   *     name: string,
   *     filePath: string,
   *     size: number
   *   }
   * }
   */
  fastify.post('/upload', {
    preHandler: [authMiddleware], // Requiere autenticación
  }, async (request, reply) => {
    return imagekitController.uploadFile(request, reply);
  });

  /**
   * DELETE /api/imagekit/file/:fileId
   * Elimina un archivo de ImageKit por su ID
   * Requiere autenticación JWT
   * 
   * Response:
   * {
   *   success: true,
   *   message: string
   * }
   */
  fastify.delete('/file/:fileId', {
    preHandler: [authMiddleware], // Requiere autenticación
  }, async (request, reply) => {
    return imagekitController.deleteFile(request, reply);
  });
}
