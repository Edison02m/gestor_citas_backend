/**
 * Servicio de Keep-Alive para mantener activo el servidor en Render
 * y la conexión con la base de datos CockroachDB
 */

import cron from 'node-cron';
import prisma from '../database/prisma';

class KeepAliveService {
  private isRunning = false;
  private cronJob: any = null;

  /**
   * Inicia el servicio de keep-alive
   * Se ejecuta cada 10 minutos para evitar que Render se duerma (se duerme a los 15 min)
   */
  iniciar() {
    if (this.isRunning) {
      console.log('⚠️  Keep-Alive ya está ejecutándose');
      return;
    }

    // Solo ejecutar en producción (Render)
    if (process.env.NODE_ENV !== 'production') {
      console.log('ℹ️  Keep-Alive desactivado en desarrollo');
      return;
    }

    console.log('🔄 Iniciando servicio Keep-Alive...');
    
    // Ejecutar cada 10 minutos (cron: minuto hora * * *)
    this.cronJob = cron.schedule('*/10 * * * *', async () => {
      await this.ping();
    });

    this.isRunning = true;
    console.log('✅ Keep-Alive iniciado - Ping cada 10 minutos');
  }

  /**
   * Detiene el servicio de keep-alive
   */
  detener() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      console.log('🛑 Keep-Alive detenido');
    }
  }

  /**
   * Ejecuta un ping a la base de datos
   * Query simple y ligera para mantener la conexión activa
   */
  private async ping() {
    try {
      const startTime = Date.now();
      
      // Query super simple: contar registros de SuperAdmin
      const count = await prisma.superAdmin.count();
      
      const duration = Date.now() - startTime;
      
      console.log(`🏓 Keep-Alive ping exitoso (${duration}ms) - SuperAdmins: ${count}`);
      
      return { success: true, duration, count };
    } catch (error: any) {
      console.error('❌ Error en Keep-Alive ping:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ejecuta un ping manual (útil para testing)
   */
  async pingManual() {
    return await this.ping();
  }
}

// Exportar instancia única (singleton)
export default new KeepAliveService();
