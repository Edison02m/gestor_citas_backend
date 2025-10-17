# 🗓️ Gestor de Citas - Backend API

Sistema de gestión de citas para negocios con suscripciones basadas en códigos.

## 🚀 Tecnologías

- **Node.js** 18+
- **Fastify** - Framework web
- **TypeScript**
- **Prisma ORM**
- **PostgreSQL**
- **JWT** - Autenticación

## 📋 Características

### ✅ Autenticación Unificada
- Login único para SuperAdmin y Usuarios
- JWT tokens
- Middleware de autorización por roles

### ✅ Gestión de Usuarios
- Registro con creación automática de negocio
- Validaciones robustas
- Relación 1:1 Usuario-Negocio

### ✅ Sistema de Suscripciones
- Códigos de activación (PRUEBA, MENSUAL, TRIMESTRAL, etc.)
- Verificación automática de expiración
- Estados: SIN_SUSCRIPCION, ACTIVA, VENCIDA, BLOQUEADA

### ✅ Panel SuperAdmin
- CRUD de códigos de suscripción
- Generación múltiple de códigos
- Estadísticas

### ✅ Arquitectura Optimizada
- Dependency Injection
- Singleton de PrismaClient
- Patrón Repository
- Separación por capas

## 🛠️ Instalación

```bash
# Clonar repositorio
git clone https://github.com/Edison02m/gestor_citas_backend.git
cd gestor_citas_backend

# Instalar dependencias
npm install

# Configurar .env
DATABASE_URL="postgresql://user:pass@localhost:5432/gestor_citas"
PORT=3000
JWT_SECRET="tu_secreto"
CORS_ORIGIN="http://localhost:3001"

# Generar Prisma Client
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Iniciar en desarrollo
npm run dev
```

## 📁 Estructura

```
src/
├── controllers/       # Manejo de requests
├── services/         # Lógica de negocio
├── repositories/     # Acceso a datos
├── routes/           # Rutas API
├── middlewares/      # Autenticación, validación
├── models/           # Interfaces TypeScript
├── database/         # Configuración Prisma
└── utils/            # Utilidades (JWT, bcrypt)
```

## 📡 Endpoints Principales

### Autenticación
- `POST /api/auth/login` - Login unificado
- `GET /api/auth/me` - Usuario actual

### Usuarios
- `POST /api/usuarios/register` - Registro
- `GET /api/usuarios/profile` - Perfil
- `PUT /api/usuarios/profile` - Actualizar perfil

### Códigos (SuperAdmin)
- `GET /api/codigos-suscripcion` - Listar
- `POST /api/codigos-suscripcion` - Crear
- `POST /api/codigos-suscripcion/generar-multiples` - Generar múltiples

### Suscripciones
- `POST /api/suscripciones/activar-codigo` - Activar código
- `GET /api/suscripciones/mi-suscripcion` - Ver suscripción

## 🔒 Autenticación

Rutas protegidas requieren:
```
Authorization: Bearer <token_jwt>
```

## 🔧 Scripts

```bash
npm run dev        # Desarrollo con tsx watch
npm run build      # Compilar TypeScript
npm start          # Producción
npm run prisma:generate  # Generar cliente
npm run prisma:studio    # Abrir Prisma Studio
```

## 📚 Documentación

- [AUTH_UNIFICADO.md](./AUTH_UNIFICADO.md) - Autenticación
- [USUARIOS_API.md](./USUARIOS_API.md) - API de usuarios
- [CODIGOS_SUSCRIPCION_API.md](./CODIGOS_SUSCRIPCION_API.md) - API de códigos
- [OPTIMIZACION_CONTROLADORES.md](./OPTIMIZACION_CONTROLADORES.md) - Optimizaciones

## 👤 Autor

**Edison Morales**
- GitHub: [@Edison02m](https://github.com/Edison02m)

---

⚡ Desarrollado con Node.js, Fastify, TypeScript y Prisma
