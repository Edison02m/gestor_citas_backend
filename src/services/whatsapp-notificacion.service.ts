// src/services/whatsapp-notificacion.service.ts

import { PrismaClient } from '@prisma/client';
import { evolutionApiService } from './evolution-api.service';
import usoRecursosService from './uso-recursos.service';

interface DatosCita {
  clienteNombre: string;
  clienteTelefono: string;
  fecha: string; // "YYYY-MM-DD"
  horaInicio: string; // "09:00"
  horaFin: string; // "10:00"
  servicioNombre: string;
  negocioNombre: string;
  sucursalNombre?: string;
  // Nuevos campos opcionales para personalización de mensajes
  empleadoNombre?: string;
  sucursalDireccion?: string;
  sucursalCiudad?: string;
  sucursalTelefono?: string;
  sucursalMaps?: string;
  precio?: string;
}

export class WhatsAppNotificacionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Reemplazar variables en el mensaje personalizado
   * Solo procesa las variables que están presentes en el mensaje para mejor rendimiento
   */
  private reemplazarVariables(mensaje: string, datos: DatosCita): string {
    // Mapa de todas las variables disponibles con sus valores
    const variables: { [key: string]: string } = {
      '{cliente}': datos.clienteNombre,
      '{fecha}': this.formatearFecha(datos.fecha),
      '{hora}': datos.horaInicio, // Mantener compatibilidad
      '{hora_inicio}': datos.horaInicio,
      '{hora_fin}': datos.horaFin,
      '{negocio}': datos.negocioNombre,
      '{servicio}': datos.servicioNombre,
      '{sucursal}': datos.sucursalNombre || '',
      '{empleado}': datos.empleadoNombre || '',
      '{direccion}': datos.sucursalDireccion || '',
      '{ciudad}': datos.sucursalCiudad || '',
      '{telefono_sucursal}': datos.sucursalTelefono || '',
      '{maps}': datos.sucursalMaps || '',
      '{precio}': datos.precio || '',
    };

    // Reemplazar solo las variables que están en el mensaje
    let mensajePersonalizado = mensaje;
    
    for (const [variable, valor] of Object.entries(variables)) {
      // Solo procesar si la variable está en el mensaje
      if (mensajePersonalizado.includes(variable)) {
        mensajePersonalizado = mensajePersonalizado.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), valor);
      }
    }

    return mensajePersonalizado;
  }

  /**
   * Formatear fecha legible (ej: "Lunes 25 de Noviembre")
   */
  private formatearFecha(fechaISO: string): string {
    const fecha = new Date(fechaISO + 'T00:00:00');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const diaSemana = dias[fecha.getDay()];
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];

    return `${diaSemana} ${dia} de ${mes}`;
  }

  /**
   * Enviar confirmación de cita por WhatsApp
   */
  async enviarConfirmacionCita(
    negocioId: string,
    citaId: string,
    datosCita: DatosCita
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Obtener configuración del negocio
      const negocio = await this.prisma.negocio.findUnique({
        where: { id: negocioId },
      });

      if (!negocio) {
        throw new Error('Negocio no encontrado');
      }

      // 2. Verificar que WhatsApp esté habilitado y conectado
      if (!negocio.notificacionesWhatsApp) {
        console.log(`⚠️ WhatsApp deshabilitado para negocio ${negocio.nombre}`);
        return { success: false, error: 'WhatsApp deshabilitado' };
      }

      if (!negocio.whatsappConnected || !negocio.whatsappInstanceId) {
        console.log(`⚠️ WhatsApp no conectado para negocio ${negocio.nombre}`);
        return { success: false, error: 'WhatsApp no conectado' };
      }

      // 3. Verificar que el número tenga WhatsApp
      const numberCheck = await evolutionApiService.checkWhatsAppNumber(
        negocio.whatsappInstanceId,
        datosCita.clienteTelefono
      );

      if (!numberCheck.exists) {
        console.log(`⚠️ El número ${datosCita.clienteTelefono} no tiene WhatsApp`);
        await this.registrarEnvio(negocioId, citaId, datosCita.clienteTelefono, false, 'Número no tiene WhatsApp');
        return { success: false, error: 'El número no tiene WhatsApp' };
      }

      // 4. Verificar límite mensual de WhatsApp
      const puedeEnviar = await usoRecursosService.puedeEnviarWhatsApp(negocioId);
      
      if (!puedeEnviar) {
        console.log(`⚠️ Límite de WhatsApp alcanzado para negocio ${negocio.nombre}`);
        await this.registrarEnvio(negocioId, citaId, datosCita.clienteTelefono, false, 'Límite mensual alcanzado');
        return { success: false, error: 'Límite mensual de WhatsApp alcanzado' };
      }

      // 5. Preparar mensaje personalizado
      const mensaje = this.reemplazarVariables(
        negocio.mensajeRecordatorio || 'Hola {cliente}, te recordamos tu cita el {fecha} a las {hora} en {negocio}. ¡Te esperamos!',
        datosCita
      );

      // 6. Enviar mensaje a través de Evolution API
      await evolutionApiService.sendTextMessage(
        negocio.whatsappInstanceId,
        datosCita.clienteTelefono,
        mensaje
      );

      console.log(`✅ WhatsApp enviado a ${datosCita.clienteNombre} (${datosCita.clienteTelefono})`);

      // 6. Registrar envío exitoso
      await this.registrarEnvio(negocioId, citaId, datosCita.clienteTelefono, true);

      // 7. Incrementar contador de WhatsApp del mes
      await usoRecursosService.incrementarWhatsApp(negocioId);

      return { success: true };
    } catch (error: any) {
      console.error('❌ Error al enviar WhatsApp:', error);

      // Registrar envío fallido
      await this.registrarEnvio(
        negocioId,
        citaId,
        datosCita.clienteTelefono,
        false,
        error.message
      );

      return { success: false, error: error.message };
    }
  }

  /**
   * Registrar el envío en la base de datos
   */
  private async registrarEnvio(
    negocioId: string,
    citaId: string,
    destinatario: string,
    exitoso: boolean,
    error?: string
  ): Promise<void> {
    try {
      await this.prisma.registroEnvio.create({
        data: {
          negocioId,
          citaId,
          tipo: 'WHATSAPP',
          destinatario,
          exitoso,
          error: error || null,
        },
      });
    } catch (err) {
      console.error('Error al registrar envío:', err);
    }
  }
}
