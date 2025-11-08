// src/services/imagekit.service.ts
import ImageKit from '@imagekit/nodejs';

/**
 * Servicio para integración con ImageKit.io
 * 
 * Funcionalidades:
 * - Generar parámetros de autenticación para upload desde cliente
 * - Upload directo desde servidor (para casos especiales)
 * - Validación de URLs de ImageKit
 */
class ImageKitService {
  private imagekit: ImageKit;
  private urlEndpoint: string;
  private publicKey: string;

  constructor() {
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error('❌ ImageKit credentials not configured in .env file');
    }

    this.publicKey = publicKey;
    this.urlEndpoint = urlEndpoint;
    this.imagekit = new ImageKit({
      privateKey,
    } as any);

    // Solo mostrar en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ ImageKit Service initialized successfully');
    }
  }

  /**
   * Obtener Public Key para uso en frontend
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Obtener URL Endpoint para uso en frontend
   */
  getUrlEndpoint(): string {
    return this.urlEndpoint;
  }

  /**
   * Genera parámetros de autenticación para upload seguro desde cliente
   * El cliente usa estos parámetros para subir directamente a ImageKit
   * 
   * @param token - Token único (opcional, se genera automáticamente)
   * @param expire - Tiempo de expiración en segundos (opcional, default 3600 = 1 hora)
   * @returns { token, expire, signature } para usar en upload desde cliente
   */
  getAuthenticationParameters(token?: string, expire?: number) {
    try {
      const authParams = this.imagekit.helper.getAuthenticationParameters(token, expire);
      
      return {
        success: true,
        data: authParams,
      };
    } catch (error: any) {
      console.error('❌ Error generating auth parameters:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate authentication parameters',
      };
    }
  }

  /**
   * Upload directo desde servidor
   * Usar solo para casos especiales (migraciones, admin, procesamiento batch)
   * 
   * @param file - Archivo (base64 string o URL)
   * @param fileName - Nombre del archivo
   * @param folder - Carpeta en ImageKit (ej: "logos/negocios")
   * @param tags - Tags opcionales para organizar
   * @returns Información del archivo subido (url, fileId, etc)
   */
  async uploadFile(
    file: string,
    fileName: string,
    folder: string = 'logos',
    tags?: string[]
  ) {
    try {
      const uploadResult = await this.imagekit.files.upload({
        file, // base64 string o URL
        fileName,
        folder,
        tags,
        useUniqueFileName: true, // Evita colisiones de nombres
      } as any);

      return {
        success: true,
        data: {
          url: uploadResult.url,
          fileId: uploadResult.fileId,
          thumbnailUrl: uploadResult.thumbnailUrl,
          name: uploadResult.name,
          filePath: uploadResult.filePath,
          size: uploadResult.size,
        },
      };
    } catch (error: any) {
      console.error('❌ Error uploading file:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file',
      };
    }
  }

  /**
   * Valida si una URL pertenece a ImageKit
   * @param url - URL a validar
   * @returns true si es URL válida de ImageKit
   */
  isValidImageKitUrl(url: string): boolean {
    try {
      return url.startsWith(this.urlEndpoint);
    } catch (error) {
      return false;
    }
  }

  /**
   * Elimina un archivo de ImageKit por su fileId
   * Útil para limpiar archivos antiguos cuando se actualiza el logo
   * 
   * @param fileId - ID del archivo en ImageKit
   * @returns success/error
   */
  async deleteFile(fileId: string) {
    try {
      await this.imagekit.files.delete(fileId);
      
      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error: any) {
      console.error('❌ Error deleting file:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete file',
      };
    }
  }

  /**
   * Genera URL transformada de imagen
   * Útil para generar thumbnails o versiones optimizadas
   * 
   * @param src - Path del archivo en ImageKit
   * @param transformations - Transformaciones a aplicar
   * @returns URL transformada
   */
  generateTransformedUrl(
    src: string,
    transformations?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'jpg' | 'png' | 'webp' | 'avif';
    }
  ): string {
    try {
      return this.imagekit.helper.buildSrc({
        urlEndpoint: this.urlEndpoint,
        src,
        transformation: transformations ? [transformations] : undefined,
      });
    } catch (error: any) {
      console.error('❌ Error generating transformed URL:', error);
      return src; // Retorna original si falla
    }
  }
}

// Exportar instancia única (Singleton)
export const imagekitService = new ImageKitService();
