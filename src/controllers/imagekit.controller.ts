// src/controllers/imagekit.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { imagekitService } from '../services/imagekit.service';

/**
 * Controlador para endpoints de ImageKit
 * Maneja autenticación y uploads de imágenes
 */
export class ImageKitController {
  /**
   * GET /api/imagekit/auth
   * Genera parámetros de autenticación para upload seguro desde cliente
   * 
   * El cliente usa estos parámetros para subir directamente a ImageKit sin exponer la private key
   * 
   * @returns { token, expire, signature, publicKey, urlEndpoint }
   */
  async getAuthParameters(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const result = imagekitService.getAuthenticationParameters();

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to generate auth parameters',
        });
      }

      // Agregar public key y URL endpoint para que el cliente los use
      return reply.send({
        success: true,
        data: {
          ...result.data,
          publicKey: imagekitService.getPublicKey(),
          urlEndpoint: imagekitService.getUrlEndpoint(),
        },
      });
    } catch (error: any) {
      console.error('❌ Error in getAuthParameters:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /api/imagekit/upload
   * Upload directo desde servidor (casos especiales)
   * 
   * Body esperado:
   * {
   *   file: string (base64 o URL),
   *   fileName: string,
   *   folder?: string,
   *   tags?: string[]
   * }
   */
  async uploadFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { file, fileName, folder, tags } = request.body as {
        file: string;
        fileName: string;
        folder?: string;
        tags?: string[];
      };

      // Validaciones
      if (!file || !fileName) {
        return reply.status(400).send({
          success: false,
          error: 'File and fileName are required',
        });
      }

      const result = await imagekitService.uploadFile(
        file,
        fileName,
        folder || 'logos',
        tags
      );

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to upload file',
        });
      }

      return reply.send({
        success: true,
        data: result.data,
      });
    } catch (error: any) {
      console.error('❌ Error in uploadFile:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /api/imagekit/file/:fileId
   * Elimina un archivo de ImageKit
   * 
   * Útil para limpiar archivos antiguos
   */
  async deleteFile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { fileId } = request.params as { fileId: string };

      if (!fileId) {
        return reply.status(400).send({
          success: false,
          error: 'fileId is required',
        });
      }

      const result = await imagekitService.deleteFile(fileId);

      if (!result.success) {
        return reply.status(500).send({
          success: false,
          error: result.error || 'Failed to delete file',
        });
      }

      return reply.send({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      console.error('❌ Error in deleteFile:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

// Exportar instancia del controlador
export const imagekitController = new ImageKitController();
