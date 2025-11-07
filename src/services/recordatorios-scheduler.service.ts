// src/services/recordatorios-scheduler.service.ts

import cron from 'node-cron';
import recordatoriosService from './recordatorios.service';

/**
 * Servicio para ejecutar recordatorios automáticos vía cron job
 * Se ejecuta cada 5 minutos para verificar y enviar recordatorios pendientes
 */
class RecordatoriosSchedulerService {
  private isRunning = false;

  /**
   * Formatea fecha/hora en formato Ecuador (UTC-5)
   */
  private formatearHoraEcuador(fecha: Date): string {
    // Convertir a hora de Ecuador (UTC-5)
    const ecuadorOffset = -5 * 60; // -5 horas en minutos
    const utcTime = fecha.getTime() + (fecha.getTimezoneOffset() * 60000);
    const ecuadorTime = new Date(utcTime + (ecuadorOffset * 60000));
    
    const horas = ecuadorTime.getHours().toString().padStart(2, '0');
    const minutos = ecuadorTime.getMinutes().toString().padStart(2, '0');
    const segundos = ecuadorTime.getSeconds().toString().padStart(2, '0');
    
    return `${horas}:${minutos}:${segundos}`;
  }

  /**
   * Calcula cuándo será la próxima ejecución del cron (cada 5 minutos)
   */
  private calcularProximaEjecucion(): { fecha: Date; enMinutos: number; enSegundos: number } {
    const ahora = new Date();
    const minutosActuales = ahora.getMinutes();
    
    // Calcular el próximo múltiplo de 5 minutos (DESPUÉS del minuto actual)
    const proximoMinuto = (Math.floor(minutosActuales / 5) + 1) * 5;
    
    const proximaEjecucion = new Date(ahora);
    
    // Si el próximo múltiplo es 60 o más, pasar a la siguiente hora
    if (proximoMinuto >= 60) {
      proximaEjecucion.setHours(proximaEjecucion.getHours() + 1);
      proximaEjecucion.setMinutes(proximoMinuto - 60, 0, 0);
    } else {
      proximaEjecucion.setMinutes(proximoMinuto, 0, 0);
    }
    
    const diferenciaMs = proximaEjecucion.getTime() - ahora.getTime();
    const enSegundos = Math.floor(diferenciaMs / 1000);
    const enMinutos = Math.floor(enSegundos / 60);
    
    return {
      fecha: proximaEjecucion,
      enMinutos,
      enSegundos
    };
  }

  /**
   * Formatea el tiempo restante en formato legible
   */
  private formatearTiempoRestante(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Inicia el cron job que procesa recordatorios cada 5 minutos
   */
  iniciar() {
    // Ejecutar cada 5 minutos: */5 * * * *
    // Minuto: */5 (cada 5 minutos)
    // Hora: * (todas)
    // Día del mes: * (todos)
    // Mes: * (todos)
    // Día de la semana: * (todos)
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        console.log('⏸️  [Recordatorios] Ya hay un proceso en ejecución, esperando...');
        return;
      }

      const ahora = new Date();
      const horaActual = this.formatearHoraEcuador(ahora);

      this.isRunning = true;
      console.log(`\n⏰ [Recordatorios] Ejecutando procesamiento - ${horaActual}`);
      
      try {
        await recordatoriosService.procesarRecordatorios();
      } catch (error: any) {
        console.error('❌ [Recordatorios] Error en procesamiento:', error.message);
      } finally {
        this.isRunning = false;
        
        // Calcular y mostrar cuándo será la próxima ejecución
        const proxima = this.calcularProximaEjecucion();
        const horaProxima = this.formatearHoraEcuador(proxima.fecha).substring(0, 5); // Solo HH:MM
        
        console.log(`📅 [Recordatorios] Próxima ejecución: ${horaProxima} (en ${this.formatearTiempoRestante(proxima.enSegundos)})\n`);
      }
    });

    // Mostrar información inicial
    const proxima = this.calcularProximaEjecucion();
    const horaProxima = this.formatearHoraEcuador(proxima.fecha).substring(0, 5); // Solo HH:MM
    
    console.log('✅ Scheduler de recordatorios iniciado (cada 5 minutos)');
    console.log(`📅 Primera ejecución: ${horaProxima} (en ${this.formatearTiempoRestante(proxima.enSegundos)})`);
  }
}

export default new RecordatoriosSchedulerService();
