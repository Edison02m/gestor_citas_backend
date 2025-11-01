import { Resend } from 'resend';
import * as React from 'react';
import { CitaConfirmacion } from './templates/CitaConfirmacion';

export class EmailService {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY no está configurada. Los emails no se enviarán.');
      this.resend = new Resend('re_placeholder'); // Placeholder para evitar errores
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  /**
   * Envía un email de confirmación de cita
   * @param data - Datos de la cita para el email
   * @returns Promise con el resultado del envío
   */
  async enviarConfirmacionCita(data: {
    emailDestinatario: string;
    nombreCliente: string;
    nombreNegocio: string;
    nombreServicio: string;
    nombreEmpleado: string;
    fecha: string;
    hora: string;
    nombreSucursal: string;
    direccionSucursal?: string;
    telefonoSucursal?: string;
    googleMapsUrl?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validar que RESEND_API_KEY esté configurada
      if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️  Email NO enviado: RESEND_API_KEY no configurada');
        return {
          success: false,
          error: 'RESEND_API_KEY no configurada',
        };
      }

      // Determinar el email FROM según el entorno
      const fromEmail = this.getFromEmail();

      // En desarrollo, redirigir todos los emails al dueño de la cuenta
      const emailDestino = this.getEmailDestino(data.emailDestinatario);

      console.log(`📧 Enviando email de confirmación a: ${emailDestino}`);

      const { data: emailData, error } = await this.resend.emails.send({
        from: fromEmail,
        to: [emailDestino],
        subject: `✅ Confirmación de cita - ${data.nombreNegocio}`,
        react: React.createElement(CitaConfirmacion, {
          nombreCliente: data.nombreCliente,
          nombreNegocio: data.nombreNegocio,
          nombreServicio: data.nombreServicio,
          nombreEmpleado: data.nombreEmpleado,
          fecha: data.fecha,
          hora: data.hora,
          nombreSucursal: data.nombreSucursal,
          direccionSucursal: data.direccionSucursal,
          telefonoSucursal: data.telefonoSucursal,
          googleMapsUrl: data.googleMapsUrl,
        }),
      });

      if (error) {
        console.error('❌ Error al enviar email:', error);
        return {
          success: false,
          error: error.message || 'Error desconocido al enviar email',
        };
      }

      console.log(`✅ Email enviado exitosamente. ID: ${emailData?.id}`);
      return {
        success: true,
        messageId: emailData?.id,
      };
    } catch (error) {
      console.error('❌ Excepción al enviar email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  /**
   * Determina el email FROM según el entorno
   * En desarrollo: usa emails de prueba de Resend
   * En producción: usa el dominio verificado
   */
  private getFromEmail(): string {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      // En desarrollo, usa el email de prueba de Resend
      return 'onboarding@resend.dev';
    } else {
      // En producción, usa tu dominio verificado
      const domain = process.env.EMAIL_FROM_DOMAIN || 'resend.dev';
      const name = process.env.EMAIL_FROM_NAME || 'CitaYA';
      return `${name} <noreply@${domain}>`;
    }
  }

  /**
   * Determina el email de destino según el entorno
   * En desarrollo sin dominio verificado: redirige al email del dueño de la cuenta
   * En producción: envía al email real del cliente
   */
  private getEmailDestino(emailCliente: string): string {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const testEmailOverride = process.env.RESEND_TEST_EMAIL;
    
    if (isDevelopment && testEmailOverride) {
      // Si hay un email de testing configurado, usar ese
      console.log(`🔄 [MODO TESTING] Email redirigido de ${emailCliente} → ${testEmailOverride}`);
      return testEmailOverride;
    }
    
    // En producción o sin override, usar el email del cliente
    return emailCliente;
  }

  /**
   * Verifica si el servicio de email está configurado correctamente
   */
  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY;
  }
}

// Exportar una instancia singleton
export const emailService = new EmailService();
