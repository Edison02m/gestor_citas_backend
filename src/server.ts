import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.routes';
import { superAdminRoutes } from './routes/superadmin.routes';
import { codigoSuscripcionRoutes } from './routes/codigo-suscripcion.routes';
import { usuarioRoutes } from './routes/usuario.routes';
import { suscripcionRoutes } from './routes/suscripcion.routes';
import { onboardingRoutes } from './routes/onboarding.routes';
import { negocioRoutes } from './routes/negocio.routes';
import { sucursalRoutes } from './routes/sucursal.routes';
import { clienteRoutes } from './routes/cliente.routes';
import { empleadoRoutes } from './routes/empleado.routes';
import { servicioRoutes } from './routes/servicio.routes';
import { citaRoutes } from './routes/cita.routes';
import { publicAgendaRoutes } from './routes/public-agenda.routes';
import { planesRoutes } from './routes/planes.routes';
import { configuracionPlanesRoutes } from './routes/configuracion-planes.routes';
import { enviosRoutes } from './routes/envios.routes';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { reportesRoutes } from './routes/reportes.routes';
import { imagekitRoutes } from './routes/imagekit.routes';
import planesScheduler from './services/planes-scheduler.service';
import recordatoriosScheduler from './services/recordatorios-scheduler.service';

// Cargar variables de entorno
dotenv.config();

const app = fastify({ logger: true });

// Configurar CORS
app.register(cors, {
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
});

// Ruta de prueba
app.get('/health', async () => {
  return { status: 'OK', message: 'Server is running' };
});

// ============================================================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================================================

// Registrar rutas de agenda pública
app.register(publicAgendaRoutes, { prefix: '/api/public-agenda' });

// ============================================================================
// RUTAS AUTENTICADAS
// ============================================================================

// Registrar rutas de autenticación
app.register(authRoutes, { prefix: '/api/auth' });

// Registrar rutas de super admin
app.register(superAdminRoutes, { prefix: '/api/superadmin' });

// Registrar rutas de códigos de suscripción
app.register(codigoSuscripcionRoutes, { prefix: '/api/codigos-suscripcion' });

// Registrar rutas de usuarios
app.register(usuarioRoutes, { prefix: '/api/usuarios' });

// Registrar rutas de suscripciones
app.register(suscripcionRoutes, { prefix: '/api/suscripciones' });

// Registrar rutas de onboarding
app.register(onboardingRoutes, { prefix: '/api/onboarding' });

// Registrar rutas de negocio
app.register(negocioRoutes, { prefix: '/api' });

// Registrar rutas de sucursales
app.register(sucursalRoutes, { prefix: '/api' });

// Registrar rutas de clientes
app.register(clienteRoutes, { prefix: '/api/clientes' });

// Registrar rutas de empleados
app.register(empleadoRoutes, { prefix: '/api/empleados' });

// Registrar rutas de servicios
app.register(servicioRoutes, { prefix: '/api' });

// Registrar rutas de citas
app.register(citaRoutes, { prefix: '/api/citas' });

// Registrar rutas de envíos (emails y WhatsApp)
app.register(enviosRoutes, { prefix: '/api/envios' });

// Registrar rutas de WhatsApp (Evolution API)
app.register(whatsappRoutes, { prefix: '/api/whatsapp' });

// Registrar rutas de planes
app.register(planesRoutes, { prefix: '/api' });

// Registrar rutas de configuración de planes (Super Admin)
app.register(configuracionPlanesRoutes, { prefix: '/api/super-admin/planes' });

// Registrar rutas de reportes y estadísticas
app.register(reportesRoutes, { prefix: '/api/reportes' });

// Registrar rutas de ImageKit (upload de imágenes)
app.register(imagekitRoutes, { prefix: '/api/imagekit' });

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
    
    // 🎯 Iniciar scheduler de planes pendientes
    planesScheduler.iniciar();
    
    // 📅 Iniciar scheduler de recordatorios automáticos
    recordatoriosScheduler.iniciar();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
