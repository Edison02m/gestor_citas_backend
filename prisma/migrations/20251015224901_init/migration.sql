-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'ADMIN_NEGOCIO');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('PRUEBA_GRATIS', 'ACTIVA', 'VENCIDA', 'BLOQUEADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PlanSuscripcion" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "AccionSuscripcion" AS ENUM ('REGISTRO', 'ACTIVACION_CODIGO', 'RENOVACION', 'VENCIMIENTO', 'BLOQUEO', 'DESBLOQUEO', 'CANCELACION', 'CAMBIO_PLAN');

-- CreateEnum
CREATE TYPE "EstadoEmpleado" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoSucursal" AS ENUM ('ACTIVA', 'INACTIVA');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "CanalOrigen" AS ENUM ('MANUAL', 'WEB', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('CONFIRMACION', 'RECORDATORIO_24H', 'RECORDATORIO_1H', 'CANCELACION', 'REAGENDAMIENTO');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'ADMIN_NEGOCIO',
    "primerLogin" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negocio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "logo" TEXT,
    "descripcion" TEXT,
    "usuarioId" TEXT NOT NULL,
    "estadoSuscripcion" "EstadoSuscripcion" NOT NULL DEFAULT 'PRUEBA_GRATIS',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaFinPrueba" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3),
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "motivoBloqueo" TEXT,
    "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Guayaquil',
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "idioma" TEXT NOT NULL DEFAULT 'es',
    "notificacionesWhatsApp" BOOLEAN NOT NULL DEFAULT true,
    "notificacionesEmail" BOOLEAN NOT NULL DEFAULT true,
    "recordatorio24h" BOOLEAN NOT NULL DEFAULT true,
    "recordatorio1h" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "codigoId" TEXT NOT NULL,
    "fechaActivacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "renovacionAuto" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoSuscripcion" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "plan" "PlanSuscripcion" NOT NULL DEFAULT 'MENSUAL',
    "duracionMeses" INTEGER NOT NULL,
    "descripcion" TEXT,
    "precio" DECIMAL(10,2),
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "fechaUso" TIMESTAMP(3),
    "fechaExpiracion" TIMESTAMP(3),
    "usoMaximo" INTEGER NOT NULL DEFAULT 1,
    "vecesUsado" INTEGER NOT NULL DEFAULT 0,
    "creadoPor" TEXT NOT NULL,
    "motivoCreacion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodigoSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialSuscripcion" (
    "id" TEXT NOT NULL,
    "suscripcionId" TEXT NOT NULL,
    "accion" "AccionSuscripcion" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "codigoUsado" TEXT,
    "realizadoPor" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT,
    "notas" TEXT,
    "negocioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "foto" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "estado" "EstadoEmpleado" NOT NULL DEFAULT 'ACTIVO',
    "negocioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioEmpleado" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "tieneDescanso" BOOLEAN NOT NULL DEFAULT false,
    "descansoInicio" TEXT,
    "descansoFin" TEXT,

    CONSTRAINT "HorarioEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloqueoEmpleado" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "todoElDia" BOOLEAN NOT NULL DEFAULT true,
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueoEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "linkMaps" TEXT,
    "estado" "EstadoSucursal" NOT NULL DEFAULT 'ACTIVA',
    "negocioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioSucursal" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "abierto" BOOLEAN NOT NULL DEFAULT true,
    "horaApertura" TEXT,
    "horaCierre" TEXT,

    CONSTRAINT "HorarioSucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FotoSucursal" (
    "id" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FotoSucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "duracion" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "foto" TEXT,
    "estado" "EstadoServicio" NOT NULL DEFAULT 'ACTIVO',
    "negocioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicioExtra" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicioExtra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" TIME NOT NULL,
    "horaFin" TIME NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "precioTotal" DECIMAL(10,2) NOT NULL,
    "canalOrigen" "CanalOrigen" NOT NULL DEFAULT 'MANUAL',
    "clienteId" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "extrasSeleccionados" JSONB,
    "creadoPor" TEXT,
    "modificadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacionCita" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "fechaEnvio" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionCita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpleadoSucursal" (
    "empleadoId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpleadoSucursal_pkey" PRIMARY KEY ("empleadoId","sucursalId")
);

-- CreateTable
CREATE TABLE "ServicioSucursal" (
    "servicioId" TEXT NOT NULL,
    "sucursalId" TEXT NOT NULL,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicioSucursal_pkey" PRIMARY KEY ("servicioId","sucursalId")
);

-- CreateTable
CREATE TABLE "LogAcceso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "negocioId" TEXT,
    "accion" TEXT NOT NULL,
    "endpoint" TEXT,
    "metodo" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "exitoso" BOOLEAN NOT NULL DEFAULT true,
    "mensaje" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogCambio" (
    "id" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "datosAntes" JSONB,
    "datosDespues" JSONB,
    "realizadoPor" TEXT,
    "negocioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogCambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionGlobal" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE INDEX "SuperAdmin_email_idx" ON "SuperAdmin"("email");

-- CreateIndex
CREATE INDEX "SuperAdmin_activo_idx" ON "SuperAdmin"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "Negocio_usuarioId_key" ON "Negocio"("usuarioId");

-- CreateIndex
CREATE INDEX "Negocio_usuarioId_idx" ON "Negocio"("usuarioId");

-- CreateIndex
CREATE INDEX "Negocio_estadoSuscripcion_idx" ON "Negocio"("estadoSuscripcion");

-- CreateIndex
CREATE INDEX "Negocio_fechaFinPrueba_idx" ON "Negocio"("fechaFinPrueba");

-- CreateIndex
CREATE INDEX "Negocio_fechaVencimiento_idx" ON "Negocio"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "Negocio_bloqueado_idx" ON "Negocio"("bloqueado");

-- CreateIndex
CREATE UNIQUE INDEX "Suscripcion_negocioId_key" ON "Suscripcion"("negocioId");

-- CreateIndex
CREATE INDEX "Suscripcion_negocioId_idx" ON "Suscripcion"("negocioId");

-- CreateIndex
CREATE INDEX "Suscripcion_codigoId_idx" ON "Suscripcion"("codigoId");

-- CreateIndex
CREATE INDEX "Suscripcion_fechaVencimiento_idx" ON "Suscripcion"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "Suscripcion_activa_idx" ON "Suscripcion"("activa");

-- CreateIndex
CREATE UNIQUE INDEX "CodigoSuscripcion_codigo_key" ON "CodigoSuscripcion"("codigo");

-- CreateIndex
CREATE INDEX "CodigoSuscripcion_codigo_idx" ON "CodigoSuscripcion"("codigo");

-- CreateIndex
CREATE INDEX "CodigoSuscripcion_usado_idx" ON "CodigoSuscripcion"("usado");

-- CreateIndex
CREATE INDEX "CodigoSuscripcion_plan_idx" ON "CodigoSuscripcion"("plan");

-- CreateIndex
CREATE INDEX "CodigoSuscripcion_fechaExpiracion_idx" ON "CodigoSuscripcion"("fechaExpiracion");

-- CreateIndex
CREATE INDEX "HistorialSuscripcion_suscripcionId_idx" ON "HistorialSuscripcion"("suscripcionId");

-- CreateIndex
CREATE INDEX "HistorialSuscripcion_accion_idx" ON "HistorialSuscripcion"("accion");

-- CreateIndex
CREATE INDEX "HistorialSuscripcion_createdAt_idx" ON "HistorialSuscripcion"("createdAt");

-- CreateIndex
CREATE INDEX "Cliente_negocioId_idx" ON "Cliente"("negocioId");

-- CreateIndex
CREATE INDEX "Cliente_telefono_idx" ON "Cliente"("telefono");

-- CreateIndex
CREATE INDEX "Cliente_email_idx" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "Cliente_nombre_idx" ON "Cliente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_negocioId_telefono_key" ON "Cliente"("negocioId", "telefono");

-- CreateIndex
CREATE INDEX "Empleado_negocioId_idx" ON "Empleado"("negocioId");

-- CreateIndex
CREATE INDEX "Empleado_estado_idx" ON "Empleado"("estado");

-- CreateIndex
CREATE INDEX "Empleado_nombre_idx" ON "Empleado"("nombre");

-- CreateIndex
CREATE INDEX "HorarioEmpleado_empleadoId_idx" ON "HorarioEmpleado"("empleadoId");

-- CreateIndex
CREATE INDEX "HorarioEmpleado_diaSemana_idx" ON "HorarioEmpleado"("diaSemana");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioEmpleado_empleadoId_diaSemana_key" ON "HorarioEmpleado"("empleadoId", "diaSemana");

-- CreateIndex
CREATE INDEX "BloqueoEmpleado_empleadoId_idx" ON "BloqueoEmpleado"("empleadoId");

-- CreateIndex
CREATE INDEX "BloqueoEmpleado_fechaInicio_fechaFin_idx" ON "BloqueoEmpleado"("fechaInicio", "fechaFin");

-- CreateIndex
CREATE INDEX "Sucursal_negocioId_idx" ON "Sucursal"("negocioId");

-- CreateIndex
CREATE INDEX "Sucursal_estado_idx" ON "Sucursal"("estado");

-- CreateIndex
CREATE INDEX "Sucursal_ciudad_idx" ON "Sucursal"("ciudad");

-- CreateIndex
CREATE INDEX "HorarioSucursal_sucursalId_idx" ON "HorarioSucursal"("sucursalId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioSucursal_sucursalId_diaSemana_key" ON "HorarioSucursal"("sucursalId", "diaSemana");

-- CreateIndex
CREATE INDEX "FotoSucursal_sucursalId_idx" ON "FotoSucursal"("sucursalId");

-- CreateIndex
CREATE INDEX "FotoSucursal_orden_idx" ON "FotoSucursal"("orden");

-- CreateIndex
CREATE INDEX "Servicio_negocioId_idx" ON "Servicio"("negocioId");

-- CreateIndex
CREATE INDEX "Servicio_estado_idx" ON "Servicio"("estado");

-- CreateIndex
CREATE INDEX "Servicio_nombre_idx" ON "Servicio"("nombre");

-- CreateIndex
CREATE INDEX "ServicioExtra_servicioId_idx" ON "ServicioExtra"("servicioId");

-- CreateIndex
CREATE INDEX "ServicioExtra_estado_idx" ON "ServicioExtra"("estado");

-- CreateIndex
CREATE INDEX "Cita_negocioId_idx" ON "Cita"("negocioId");

-- CreateIndex
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");

-- CreateIndex
CREATE INDEX "Cita_empleadoId_fecha_idx" ON "Cita"("empleadoId", "fecha");

-- CreateIndex
CREATE INDEX "Cita_sucursalId_fecha_idx" ON "Cita"("sucursalId", "fecha");

-- CreateIndex
CREATE INDEX "Cita_estado_idx" ON "Cita"("estado");

-- CreateIndex
CREATE INDEX "Cita_clienteId_idx" ON "Cita"("clienteId");

-- CreateIndex
CREATE INDEX "Cita_servicioId_idx" ON "Cita"("servicioId");

-- CreateIndex
CREATE INDEX "Cita_canalOrigen_idx" ON "Cita"("canalOrigen");

-- CreateIndex
CREATE INDEX "NotificacionCita_citaId_idx" ON "NotificacionCita"("citaId");

-- CreateIndex
CREATE INDEX "NotificacionCita_estado_idx" ON "NotificacionCita"("estado");

-- CreateIndex
CREATE INDEX "NotificacionCita_tipo_idx" ON "NotificacionCita"("tipo");

-- CreateIndex
CREATE INDEX "NotificacionCita_fechaEnvio_idx" ON "NotificacionCita"("fechaEnvio");

-- CreateIndex
CREATE INDEX "EmpleadoSucursal_empleadoId_idx" ON "EmpleadoSucursal"("empleadoId");

-- CreateIndex
CREATE INDEX "EmpleadoSucursal_sucursalId_idx" ON "EmpleadoSucursal"("sucursalId");

-- CreateIndex
CREATE INDEX "ServicioSucursal_servicioId_idx" ON "ServicioSucursal"("servicioId");

-- CreateIndex
CREATE INDEX "ServicioSucursal_sucursalId_idx" ON "ServicioSucursal"("sucursalId");

-- CreateIndex
CREATE INDEX "ServicioSucursal_disponible_idx" ON "ServicioSucursal"("disponible");

-- CreateIndex
CREATE INDEX "LogAcceso_usuarioId_idx" ON "LogAcceso"("usuarioId");

-- CreateIndex
CREATE INDEX "LogAcceso_negocioId_idx" ON "LogAcceso"("negocioId");

-- CreateIndex
CREATE INDEX "LogAcceso_accion_idx" ON "LogAcceso"("accion");

-- CreateIndex
CREATE INDEX "LogAcceso_createdAt_idx" ON "LogAcceso"("createdAt");

-- CreateIndex
CREATE INDEX "LogCambio_tabla_idx" ON "LogCambio"("tabla");

-- CreateIndex
CREATE INDEX "LogCambio_registroId_idx" ON "LogCambio"("registroId");

-- CreateIndex
CREATE INDEX "LogCambio_accion_idx" ON "LogCambio"("accion");

-- CreateIndex
CREATE INDEX "LogCambio_realizadoPor_idx" ON "LogCambio"("realizadoPor");

-- CreateIndex
CREATE INDEX "LogCambio_createdAt_idx" ON "LogCambio"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionGlobal_clave_key" ON "ConfiguracionGlobal"("clave");

-- CreateIndex
CREATE INDEX "ConfiguracionGlobal_clave_idx" ON "ConfiguracionGlobal"("clave");

-- AddForeignKey
ALTER TABLE "Negocio" ADD CONSTRAINT "Negocio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_codigoId_fkey" FOREIGN KEY ("codigoId") REFERENCES "CodigoSuscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialSuscripcion" ADD CONSTRAINT "HistorialSuscripcion_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empleado" ADD CONSTRAINT "Empleado_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioEmpleado" ADD CONSTRAINT "HorarioEmpleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoEmpleado" ADD CONSTRAINT "BloqueoEmpleado_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioSucursal" ADD CONSTRAINT "HorarioSucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FotoSucursal" ADD CONSTRAINT "FotoSucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioExtra" ADD CONSTRAINT "ServicioExtra_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacionCita" ADD CONSTRAINT "NotificacionCita_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpleadoSucursal" ADD CONSTRAINT "EmpleadoSucursal_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpleadoSucursal" ADD CONSTRAINT "EmpleadoSucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioSucursal" ADD CONSTRAINT "ServicioSucursal_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioSucursal" ADD CONSTRAINT "ServicioSucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
