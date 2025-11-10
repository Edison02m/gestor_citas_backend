// src/services/recordatorios.service.ts

import { PrismaClient } from '@prisma/client';
import { WhatsAppNotificacionService } from './whatsapp-notificacion.service';
import usoRecursosService from './uso-recursos.service';

const prisma = new PrismaClient();
const whatsAppNotificacionService = new WhatsAppNotificacionService(prisma);

class RecordatoriosService {
  
  /**
   * Procesa todos los recordatorios pendientes
   * Se ejecuta cada 5 minutos vía cron job
   */
  async procesarRecordatorios(): Promise<void> {
    console.log('🔔 [Recordatorios] Iniciando procesamiento...');
    
    const ahora = new Date();
    const hace5Min = new Date(ahora.getTime() - 5 * 60 * 1000);
    
    // Obtener fecha de hoy a medianoche (para comparar con las fechas de BD)
    const hoy = new Date();
    hoy.setUTCHours(0, 0, 0, 0);
    
    try {
      // Buscar citas que necesiten recordatorio
      const citas = await prisma.cita.findMany({
        where: {
          recordatorioEnviado: false,
          estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
          fecha: { gte: hoy }, // Usar medianoche de hoy, no la hora actual
          negocio: {
            // Validaciones en cascada
            notificacionesWhatsApp: true,    // 1. Master switch ON
            recordatoriosAutomaticos: true,  // 2. Sub-switch ON
            whatsappConnected: true,         // 3. WhatsApp conectado
            recordatorio1: { not: null },    // 4. Tiempo configurado
          },
        },
        include: {
          cliente: true,
          servicio: true,
          negocio: true,
          sucursal: true,
          empleado: true,
        },
      });
      
      // Filtrar citas que estén en la ventana de tiempo (últimos 5 min)
      const citasParaEnviar = citas.filter(cita => {
        const momentoEnvio = this.calcularMomentoEnvio(
          cita.fecha,
          cita.horaInicio,
          cita.negocio.recordatorio1!
        );
        
        return momentoEnvio >= hace5Min && momentoEnvio <= ahora;
      });
      
      console.log(`📋 [Recordatorios] ${citasParaEnviar.length} recordatorios pendientes de ${citas.length} citas evaluadas`);
      
      // Enviar recordatorios
      let enviados = 0;
      let fallos = 0;
      
      for (const cita of citasParaEnviar) {
        const resultado = await this.enviarRecordatorio(cita);
        if (resultado) enviados++;
        else fallos++;
      }
      
      console.log(`✅ [Recordatorios] Procesamiento completado - Enviados: ${enviados}, Fallos: ${fallos}`);
      
    } catch (error: any) {
      console.error('❌ [Recordatorios] Error en procesamiento:', error.message);
    }
  }
  
  /**
   * Calcula el momento exacto en que debe enviarse el recordatorio
   * 
   * IMPORTANTE: Este sistema está configurado para zona horaria de Ecuador (UTC-5)
   * - Las horas de las citas se interpretan como hora de Ecuador
   * - Se convierten a UTC para cálculos internos
   * - Para soporte multi-zona, agregar campo 'zonaHoraria' al modelo Negocio
   */
  private calcularMomentoEnvio(
    fecha: Date,
    hora: string,
    minutosAntes: number
  ): Date {
    // Extraer componentes de la fecha (año, mes, día) en UTC
    const year = fecha.getUTCFullYear();
    const month = fecha.getUTCMonth();
    const day = fecha.getUTCDate();
    
    // Extraer hora y minutos de la cita (en hora de Ecuador)
    const [hours, minutes] = hora.split(':').map(Number);
    
    // Crear fecha/hora en UTC considerando que la hora ingresada es hora de Ecuador (UTC-5)
    // Ejemplo: Si la cita es a las 13:30 Ecuador, en UTC es 18:30
    const horaUTC = hours + 5; // Convertir de Ecuador (UTC-5) a UTC
    
    // Crear la fecha/hora de la cita en UTC
    const fechaHoraCita = new Date(Date.UTC(year, month, day, horaUTC, minutes, 0, 0));
    
    // Restar los minutos configurados para el recordatorio
    const momentoEnvio = new Date(
      fechaHoraCita.getTime() - minutosAntes * 60 * 1000
    );
    
    return momentoEnvio;
  }
  
  /**
   * Envía un recordatorio individual
   */
  private async enviarRecordatorio(cita: any): Promise<boolean> {
    try {
      // 1. Verificar límite de WhatsApp del plan
      const puedeEnviar = await usoRecursosService.puedeEnviarWhatsApp(cita.negocioId);
      
      if (!puedeEnviar) {
        console.log(`⚠️ [Recordatorios] Límite WhatsApp alcanzado para ${cita.negocio.nombre} - Cita: ${cita.id}`);
        // NO marcar como enviado, se reintentará en el próximo ciclo mensual
        return false;
      }
      
      // 2. Enviar recordatorio usando mensajeReagendamiento
      const resultado = await whatsAppNotificacionService.enviarRecordatorioCita(
        cita.negocioId,
        cita.id,
        {
          clienteNombre: cita.cliente.nombre,
          clienteTelefono: cita.cliente.telefono,
          fecha: cita.fecha.toISOString().split('T')[0],
          horaInicio: cita.horaInicio,
          horaFin: cita.horaFin,
          servicioNombre: cita.servicio.nombre,
          negocioNombre: cita.negocio.nombre,
          sucursalNombre: cita.sucursal?.nombre,
          empleadoNombre: cita.empleado?.nombre,
        }
      );
      
      if (!resultado.success) {
        console.log(`❌ [Recordatorios] Error enviando recordatorio - Cita: ${cita.id} - ${resultado.error}`);
        return false;
      }
      
      // 3. Marcar como enviado
      await prisma.cita.update({
        where: { id: cita.id },
        data: {
          recordatorioEnviado: true,
          recordatorioEnviadoEn: new Date(),
        },
      });
      
      const fechaFormateada = cita.fecha.toLocaleDateString('es-EC');
      console.log(`✅ [Recordatorios] Enviado a ${cita.cliente.nombre} - Cita: ${fechaFormateada} ${cita.horaInicio}`);
      return true;
      
    } catch (error: any) {
      console.error(`❌ [Recordatorios] Error procesando cita ${cita.id}:`, error.message);
      return false;
    }
  }
}

export default new RecordatoriosService();
