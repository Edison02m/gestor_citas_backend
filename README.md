# Gestor de Citas - Backend

## Tecnologías
- Node.js
- Fastify
- Prisma
- TypeScript
- PostgreSQL

## Estructura del Proyecto

```
backend/
├── src/
│   ├── controllers/    # Controladores de las rutas
│   ├── routes/         # Definición de rutas API
│   ├── services/       # Lógica de negocio
│   ├── repositories/   # Acceso a datos
│   ├── models/         # Tipos e interfaces
│   ├── database/       # Configuración de base de datos
│   ├── config/         # Configuraciones
│   └── utils/          # Utilidades
├── prisma/
│   └── schema.prisma   # Esquema de base de datos
└── server.ts           # Punto de entrada
```

## Instalación

```bash
npm install
```

## Configuración

1. Copia el archivo `.env.example` a `.env`
2. Configura las variables de entorno

## Scripts

- `npm run dev` - Modo desarrollo
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor en producción
- `npm run prisma:generate` - Generar cliente Prisma
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:studio` - Abrir Prisma Studio
