// src/services/evolution-api.service.ts

import dotenv from 'dotenv';

dotenv.config();

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:3001';

interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
  qrcode?: {
    base64: string;
    code: string;
  };
}

interface QRCodeResponse {
  base64: string;
  code: string;
}

interface ConnectionStateResponse {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
  };
}

interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: any;
  messageTimestamp: string;
  status: string;
}

/**
 * Servicio para interactuar con Evolution API
 */
class EvolutionApiService {
  private baseUrl: string;
  private apiKey: string;
  private webhookUrl: string;

  constructor() {
    this.baseUrl = EVOLUTION_API_URL;
    this.apiKey = EVOLUTION_API_KEY;
    this.webhookUrl = `${WEBHOOK_BASE_URL}/api/whatsapp/webhook`;
  }

  /**
   * Crear una nueva instancia de WhatsApp para un negocio
   */
  async createInstance(instanceName: string): Promise<CreateInstanceResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            url: this.webhookUrl,
            enabled: true,
            webhookByEvents: false,
            webhookBase64: false,
            events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al crear instancia: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as CreateInstanceResponse;
      return data;
    } catch (error: any) {
      console.error('Error en createInstance:', error);
      throw new Error(`No se pudo crear la instancia de WhatsApp: ${error.message}`);
    }
  }

  /**
   * Obtener el código QR de una instancia
   */
  async getQRCode(instanceName: string): Promise<QRCodeResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al obtener QR: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      
      // El QR viene en data.qrcode o data.base64
      return {
        base64: data.qrcode?.base64 || data.base64 || '',
        code: data.qrcode?.code || data.code || '',
      };
    } catch (error: any) {
      console.error('Error en getQRCode:', error);
      throw new Error(`No se pudo obtener el código QR: ${error.message}`);
    }
  }

  /**
   * Verificar el estado de conexión de una instancia
   */
  async getConnectionStatus(instanceName: string): Promise<ConnectionStateResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al verificar estado: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as ConnectionStateResponse;
      return data;
    } catch (error: any) {
      console.error('Error en getConnectionStatus:', error);
      throw new Error(`No se pudo verificar el estado de conexión: ${error.message}`);
    }
  }

  /**
   * Verificar si un número tiene WhatsApp
   * @param instanceName - Nombre de la instancia
   * @param phoneNumber - Número de teléfono con código de país (ej: "593991234567")
   * @returns Información del número
   * 
   * Respuesta de Evolution API:
   * [{"exists":true,"jid":"593987654321@s.whatsapp.net","number":"593987654321"}]
   */
  async checkWhatsAppNumber(
    instanceName: string,
    phoneNumber: string
  ): Promise<{ exists: boolean; jid?: string; number?: string }> {
    try {
      // Asegurar que el número tenga el formato correcto (solo números)
      const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');

      const response = await fetch(`${this.baseUrl}/chat/whatsappNumbers/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          numbers: [formattedPhone],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al verificar número: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as Array<{
        exists: boolean;
        jid: string;
        number: string;
      }>;
      
      // La respuesta es un array con la info del número
      if (data && Array.isArray(data) && data.length > 0) {
        const numberInfo = data[0];
        return {
          exists: numberInfo.exists === true, // Verificar explícitamente que sea true
          jid: numberInfo.jid,
          number: numberInfo.number,
        };
      }

      // Si no hay respuesta, asumir que no existe
      return { exists: false };
    } catch (error: any) {
      console.error('Error en checkWhatsAppNumber:', error);
      // Si falla la verificación, asumir que el número podría existir
      // para no bloquear el envío (mejor intentar y que falle que no intentar)
      return { exists: true };
    }
  }

  /**
   * Enviar un mensaje de texto
   * @param instanceName - Nombre de la instancia
   * @param phoneNumber - Número de teléfono con código de país (ej: "593991234567")
   * @param message - Texto del mensaje
   */
  async sendTextMessage(
    instanceName: string,
    phoneNumber: string,
    message: string
  ): Promise<SendMessageResponse> {
    try {
      // Asegurar que el número tenga el formato correcto
      const formattedPhone = phoneNumber.replace(/[^0-9]/g, '');

      const response = await fetch(`${this.baseUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al enviar mensaje: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as SendMessageResponse;
      return data;
    } catch (error: any) {
      console.error('Error en sendTextMessage:', error);
      throw new Error(`No se pudo enviar el mensaje de WhatsApp: ${error.message}`);
    }
  }

  /**
   * Desconectar una instancia (logout)
   */
  async disconnectInstance(instanceName: string): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al desconectar instancia: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as { status: string };
      return data;
    } catch (error: any) {
      console.error('Error en disconnectInstance:', error);
      throw new Error(`No se pudo desconectar la instancia: ${error.message}`);
    }
  }

  /**
   * Eliminar una instancia completamente
   */
  async deleteInstance(instanceName: string): Promise<{ status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'apikey': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error al eliminar instancia: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as { status: string };
      return data;
    } catch (error: any) {
      console.error('Error en deleteInstance:', error);
      throw new Error(`No se pudo eliminar la instancia: ${error.message}`);
    }
  }

  /**
   * Verificar si la API de Evolution está disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': this.apiKey,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Evolution API no está disponible:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const evolutionApiService = new EvolutionApiService();
