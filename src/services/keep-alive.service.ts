/**
 * Servicio de Keep-Alive para mantener activo el servidor en Render
 * Hace ping HTTP externo (no solo BD) para evitar spin-down en plan gratuito
 */

import cron from 'node-cron';
import prisma from '../database/prisma';

class KeepAliveService {
  private isRunning = false;
  private cronJob: any = null;
  private backendUrl = process.env.RENDER_EXTERNAL_URL || 'https://citaya-backend.onrender.com';

  /**
   * Inicia el servicio de keep-alive
   * Se ejecuta cada 10 minutos para evitar que Render se duerma (se duerme a los 15 min)
   */
  iniciar() {
    if (this.isRunning) {
      console.log('⚠️  Keep-Alive ya está ejecutándose');
      return;
    }

    // Ejecutar en producción (Render) Y en desarrollo para testing
    const enProduccion = process.env.NODE_ENV === 'production';
    
    console.log(`🔄 Iniciando servicio Keep-Alive (${enProduccion ? 'PRODUCCIÓN' : 'DESARROLLO'})...`);
    
    // Ejecutar cada 10 minutos (cron: minuto hora * * *)
    this.cronJob = cron.schedule('*/10 * * * *', async () => {
      await this.ping();
    });

    this.isRunning = true;
    console.log('✅ Keep-Alive iniciado - Ping cada 10 minutos');
    
    if (enProduccion) {
      console.log(`📡 URL de ping: ${this.backendUrl}/health`);
    }
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
   * Ejecuta ping HTTP al propio servidor (previene spin-down en Render)
   * Y también ping a la base de datos
   */
  private async ping() {
    const enProduccion = process.env.NODE_ENV === 'production';
    
    try {
      const startTime = Date.now();
      
      // 1. Ping HTTP externo (CRÍTICO para prevenir spin-down en Render)
      if (enProduccion) {
        try {
          const httpResponse = await fetch(`${this.backendUrl}/health`);
          const httpDuration = Date.now() - startTime;
          
          if (httpResponse.ok) {
            console.log(`🌐 Keep-Alive HTTP ping exitoso (${httpDuration}ms)`);
          } else {
            console.warn(`⚠️  HTTP ping con status: ${httpResponse.status}`);
          }
        } catch (httpError: any) {
          console.error('❌ Error en HTTP ping:', httpError.message);
        }
      }
      
      // 2. Ping a base de datos (mantiene conexión activa)
      const dbStartTime = Date.now();
      const count = await prisma.superAdmin.count();
      const dbDuration = Date.now() - dbStartTime;
      
      console.log(`🗄️  Keep-Alive DB ping exitoso (${dbDuration}ms) - SuperAdmins: ${count}`);
      
      return { 
        success: true, 
        httpPing: enProduccion,
        dbDuration,
        count 
      };
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
