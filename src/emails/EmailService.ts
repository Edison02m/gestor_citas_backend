import * as brevo from '@getbrevo/brevo';
import * as React from 'react';
// @ts-ignore - Ignorar error de tipos en react-dom/server
import { renderToStaticMarkup } from 'react-dom/server';
import { CitaConfirmacion } from './templates/CitaConfirmacion';
import { RecuperacionPassword } from './templates/RecuperacionPassword';

export class EmailService {
  private apiInstance: brevo.TransactionalEmailsApi;

  constructor() {
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  BREVO_API_KEY no está configurada. Los emails no se enviarán.');
    }
    
    // Configurar la API de Brevo
    this.apiInstance = new brevo.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      apiKey || ''
    );
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
      // Validar que BREVO_API_KEY esté configurada
      if (!process.env.BREVO_API_KEY) {
        console.warn('⚠️  Email NO enviado: BREVO_API_KEY no configurada');
        return {
          success: false,
          error: 'BREVO_API_KEY no configurada',
        };
      }

      // Determinar el email FROM según el entorno
      const fromEmail = this.getFromEmail();
      const fromName = this.getFromName();

      // Renderizar el template de React a HTML
      const htmlContent = renderToStaticMarkup(
        React.createElement(CitaConfirmacion, {
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
        })
      );

      // Preparar el email para Brevo
      const sendSmtpEmail: brevo.SendSmtpEmail = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: data.emailDestinatario, name: data.nombreCliente }],
        subject: `Confirmación de cita - ${data.nombreNegocio}`,
        htmlContent: htmlContent,
      };

      // Enviar el email
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      return {
        success: true,
        messageId: response.body.messageId,
      };
    } catch (error: any) {
      console.error('❌ Error al enviar email:', error);
      return {
        success: false,
        error: error?.message || error?.body?.message || 'Error desconocido al enviar email',
      };
    }
  }

  /**
   * Determina el email FROM según el entorno
   */
  private getFromEmail(): string {
    return process.env.BREVO_FROM_EMAIL || 'noreply@ejemplo.com';
  }

  /**
   * Determina el nombre FROM para los emails
   */
  private getFromName(): string {
    return process.env.EMAIL_FROM_NAME || 'CitaYA';
  }

  /**
   * Verifica si el servicio de email está configurado correctamente
   */
  isConfigured(): boolean {
    return !!process.env.BREVO_API_KEY;
  }

  /**
   * Envía un email de recuperación de contraseña
   * @param data - Datos para el email de recuperación
   * @returns Promise con el resultado del envío
   */
  async enviarRecuperacionPassword(data: {
    emailDestinatario: string;
    nombreUsuario: string;
    resetUrl: string;
    expirationMinutes: number;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validar que BREVO_API_KEY esté configurada
      if (!process.env.BREVO_API_KEY) {
        console.warn('⚠️  Email NO enviado: BREVO_API_KEY no configurada');
        return {
          success: false,
          error: 'BREVO_API_KEY no configurada',
        };
      }

      // Determinar el email FROM según el entorno
      const fromEmail = this.getFromEmail();
      const fromName = this.getFromName();

      // Renderizar el template de React a HTML
      const htmlContent = renderToStaticMarkup(
        React.createElement(RecuperacionPassword, {
          nombreUsuario: data.nombreUsuario,
          resetUrl: data.resetUrl,
          expirationMinutes: data.expirationMinutes,
        })
      );

      // Preparar el email para Brevo
      const sendSmtpEmail: brevo.SendSmtpEmail = {
        sender: { name: fromName, email: fromEmail },
        to: [{ email: data.emailDestinatario, name: data.nombreUsuario }],
        subject: 'Recuperación de Contraseña - CitaYA',
        htmlContent: htmlContent,
      };

      // Enviar el email
      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      return {
        success: true,
        messageId: response.body.messageId,
      };
    } catch (error: any) {
      console.error('❌ Error al enviar email de recuperación:', error);
      return {
        success: false,
        error: error?.message || error?.body?.message || 'Error desconocido al enviar email',
      };
    }
  }
}

// Exportar una instancia singleton
export const emailService = new EmailService();
