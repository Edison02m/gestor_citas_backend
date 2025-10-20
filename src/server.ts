import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth.routes';
import { superAdminRoutes } from './routes/superadmin.routes';
import { codigoSuscripcionRoutes } from './routes/codigo-suscripcion.routes';
import { usuarioRoutes } from './routes/usuario.routes';
import { suscripcionRoutes } from './routes/suscripcion.routes';
import { onboardingRoutes } from './routes/onboarding.routes';
import { sucursalRoutes } from './routes/sucursal.routes';

// Cargar variables de entorno
dotenv.config();

const app = fastify({ logger: true });

// Configurar CORS
app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Ruta de prueba
app.get('/health', async () => {
  return { status: 'OK', message: 'Server is running' };
});

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

// Registrar rutas de sucursales
app.register(sucursalRoutes, { prefix: '/api' });

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
