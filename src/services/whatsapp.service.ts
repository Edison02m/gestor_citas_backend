// src/services/whatsapp.service.ts

import { PrismaClient } from '@prisma/client';
import { WhatsAppRepository } from '../repositories/whatsapp.repository';
import { evolutionApiService } from './evolution-api.service';

export class WhatsAppService {
  private whatsappRepository: WhatsAppRepository;

  constructor(private prisma: PrismaClient) {
    this.whatsappRepository = new WhatsAppRepository(prisma);
  }

  /**
   * Vincular WhatsApp para un negocio
   * Crea una instancia en Evolution API y devuelve el QR Code
   */
  async vincularWhatsApp(negocioId: string) {
    try {
      // 1. Verificar que el negocio existe
      const negocio = await this.prisma.negocio.findUnique({
        where: { id: negocioId },
      });

      if (!negocio) {
        throw new Error('Negocio no encontrado');
      }

      // 2. Generar nombre único para la instancia
      const instanceName = `negocio_${negocioId}`;

      // 3. Verificar si ya tiene una instancia configurada
      if (negocio.whatsappInstanceId) {
        try {
          // Verificar estado actual en Evolution API
          const status = await evolutionApiService.getConnectionStatus(negocio.whatsappInstanceId);
          
          if (status.instance.state === 'open') {
            // Ya está conectado
            return {
              success: true,
              message: 'WhatsApp ya está vinculado y conectado',
              connected: true,
              phoneNumber: negocio.whatsappPhoneNumber,
              instanceName: negocio.whatsappInstanceId,
            };
          } else if (status.instance.state === 'close') {
            // Instancia existe pero no está conectada, obtener nuevo QR
            console.log('⚠️ Instancia existe pero no está conectada. Obteniendo nuevo QR...');
            const qrData = await evolutionApiService.getQRCode(negocio.whatsappInstanceId);
            
            // Actualizar QR en BD
            await this.whatsappRepository.updateQRCode(negocioId, qrData.base64);
            
            return {
              success: true,
              message: 'Escanea el código QR para reconectar tu WhatsApp',
              qrCode: qrData.base64,
              instanceName: negocio.whatsappInstanceId,
              connected: false,
            };
          }
        } catch (error: any) {
          console.error('⚠️ Error al verificar instancia existente:', error.message);
          // Si la instancia no existe en Evolution API, continuar con la creación
        }
      }

      // 4. Crear nueva instancia en Evolution API
      let response;
      try {
        response = await evolutionApiService.createInstance(instanceName);
      } catch (error: any) {
        // Si la instancia ya existe (error 403), intentar obtener QR
        if (error.message.includes('already in use') || error.message.includes('403')) {
          console.log('⚠️ La instancia ya existe en Evolution API. Obteniendo QR...');
          
          try {
            const qrData = await evolutionApiService.getQRCode(instanceName);
            
            // Guardar/actualizar configuración en BD
            await this.whatsappRepository.updateWhatsAppConfig(negocioId, {
              whatsappInstanceId: instanceName,
              whatsappConnected: false,
              whatsappQrCode: qrData.base64,
              whatsappConfiguredAt: new Date(),
            });
            
            return {
              success: true,
              message: 'Escanea el código QR con tu WhatsApp',
              qrCode: qrData.base64,
              instanceName,
              connected: false,
            };
          } catch (qrError: any) {
            throw new Error(`La instancia existe pero no se pudo obtener el QR: ${qrError.message}`);
          }
        }
        
        // Si es otro error, propagar
        throw error;
      }

      // 5. Guardar configuración en la base de datos
      await this.whatsappRepository.updateWhatsAppConfig(negocioId, {
        whatsappInstanceId: instanceName,
        whatsappConnected: false, // Aún no está conectado, esperando escaneo QR
        whatsappQrCode: response.qrcode?.base64 || undefined,
        whatsappConfiguredAt: new Date(),
      });

      return {
        success: true,
        message: 'Instancia creada. Escanea el código QR con tu WhatsApp',
        qrCode: response.qrcode?.base64 || null,
        instanceName,
        connected: false,
      };
    } catch (error: any) {
      console.error('Error en vincularWhatsApp:', error);
      throw new Error(`No se pudo vincular WhatsApp: ${error.message}`);
    }
  }

  /**
   * Obtener el estado de conexión de WhatsApp
   */
  async obtenerEstado(negocioId: string) {
    try {
      const config = await this.whatsappRepository.getWhatsAppConfig(negocioId);

      if (!config || !config.whatsappInstanceId) {
        return {
          connected: false,
          message: 'WhatsApp no está configurado',
        };
      }

      // Verificar estado en Evolution API
      const status = await evolutionApiService.getConnectionStatus(config.whatsappInstanceId);

      const isConnected = status.instance.state === 'open';

      // Actualizar estado en BD si cambió
      if (config.whatsappConnected !== isConnected) {
        await this.whatsappRepository.updateConnectionStatus(negocioId, isConnected);
      }

      return {
        connected: isConnected,
        phoneNumber: config.whatsappPhoneNumber,
        configuredAt: config.whatsappConfiguredAt,
        instanceId: config.whatsappInstanceId,
        state: status.instance.state,
      };
    } catch (error: any) {
      console.error('Error en obtenerEstado:', error);
      
      // Si falla, asumir que está desconectado
      return {
        connected: false,
        message: 'No se pudo verificar el estado de WhatsApp',
        error: error.message,
      };
    }
  }

  /**
   * Obtener un nuevo código QR (si el anterior expiró)
   */
  async obtenerNuevoQR(negocioId: string) {
    try {
      const config = await this.whatsappRepository.getWhatsAppConfig(negocioId);

      if (!config || !config.whatsappInstanceId) {
        throw new Error('WhatsApp no está configurado. Vincúlalo primero');
      }

      // Si ya está conectado, no necesita QR
      if (config.whatsappConnected) {
        return {
          success: false,
          message: 'WhatsApp ya está conectado. No necesitas un nuevo QR',
          connected: true,
        };
      }

      // Obtener nuevo QR de Evolution API
      const qrData = await evolutionApiService.getQRCode(config.whatsappInstanceId);

      // Actualizar QR en BD
      await this.whatsappRepository.updateQRCode(negocioId, qrData.base64);

      return {
        success: true,
        qrCode: qrData.base64,
        message: 'Escanea el código QR con tu WhatsApp',
      };
    } catch (error: any) {
      console.error('Error en obtenerNuevoQR:', error);
      throw new Error(`No se pudo obtener el código QR: ${error.message}`);
    }
  }

  /**
   * Desvincular WhatsApp de un negocio
   */
  async desvincularWhatsApp(negocioId: string) {
    try {
      const config = await this.whatsappRepository.getWhatsAppConfig(negocioId);

      if (!config || !config.whatsappInstanceId) {
        throw new Error('WhatsApp no está configurado');
      }

      // 1. Desconectar instancia en Evolution API
      try {
        await evolutionApiService.disconnectInstance(config.whatsappInstanceId);
      } catch (error) {
        console.error('Error al desconectar instancia:', error);
        // Continuar aunque falle
      }

      // 2. Opcional: Eliminar instancia completamente
      try {
        await evolutionApiService.deleteInstance(config.whatsappInstanceId);
      } catch (error) {
        console.error('Error al eliminar instancia:', error);
        // Continuar aunque falle
      }

      // 3. Limpiar configuración en BD
      await this.whatsappRepository.clearWhatsAppConfig(negocioId);

      return {
        success: true,
        message: 'WhatsApp desvinculado exitosamente',
      };
    } catch (error: any) {
      console.error('Error en desvincularWhatsApp:', error);
      throw new Error(`No se pudo desvincular WhatsApp: ${error.message}`);
    }
  }

  /**
   * Procesar eventos del webhook de Evolution API
   */
  async procesarWebhook(data: any) {
    try {
      console.log('📱 Webhook recibido:', JSON.stringify(data, null, 2));

      const { instance, data: eventData } = data;

      if (!instance) {
        console.error('❌ Webhook sin instanceName');
        return;
      }

      // Buscar el negocio por instanceId
      const negocio = await this.whatsappRepository.getNegocioByInstanceId(instance);

      if (!negocio) {
        console.error(`❌ No se encontró negocio con instanceId: ${instance}`);
        return;
      }

      // Manejar evento de actualización de conexión
      if (data.event === 'connection.update' || data.event === 'CONNECTION_UPDATE') {
        const state = eventData?.state || eventData?.connection;

        console.log(`📡 Estado de conexión para ${negocio.nombre}: ${state}`);

        if (state === 'open') {
          // WhatsApp conectado
          const phoneNumber = eventData?.phoneNumber || eventData?.instance?.wuid?.split('@')[0];

          await this.whatsappRepository.updateWhatsAppConfig(negocio.id, {
            whatsappConnected: true,
            whatsappPhoneNumber: phoneNumber || undefined,
            whatsappQrCode: undefined, // Limpiar QR ya usado
            whatsappConfiguredAt: new Date(),
          });

          console.log(`✅ WhatsApp conectado para ${negocio.nombre}: ${phoneNumber}`);
        } else if (state === 'close') {
          // WhatsApp desconectado
          await this.whatsappRepository.updateConnectionStatus(negocio.id, false);
          console.log(`❌ WhatsApp desconectado para ${negocio.nombre}`);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error procesando webhook:', error);
      return { success: false, error: error.message };
    }
  }
}
