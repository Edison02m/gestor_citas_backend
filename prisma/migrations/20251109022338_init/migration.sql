-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'ADMIN_NEGOCIO');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('SIN_SUSCRIPCION', 'ACTIVA', 'VENCIDA', 'BLOQUEADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PlanSuscripcion" AS ENUM ('GRATIS', 'PRO_MENSUAL', 'PRO_ANUAL', 'PRO_PLUS_MENSUAL', 'PRO_PLUS_ANUAL', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "AccionSuscripcion" AS ENUM ('REGISTRO', 'ACTIVACION_CODIGO', 'RENOVACION', 'VENCIMIENTO', 'BLOQUEO', 'DESBLOQUEO', 'CANCELACION', 'CAMBIO_PLAN', 'PLAN_EN_COLA', 'PLAN_ACTIVADO_AUTOMATICAMENTE');

-- CreateEnum
CREATE TYPE "EstadoEmpleado" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoSucursal" AS ENUM ('ACTIVA', 'INACTIVA');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "CanalOrigen" AS ENUM ('MANUAL', 'WEB', 'WHATSAPP', 'WEB_PUBLICA');

-- CreateEnum
CREATE TYPE "TipoEnvio" AS ENUM ('EMAIL', 'WHATSAPP');

-- DropEnum
DROP TYPE "public"."crdb_internal_region";

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" STRING NOT NULL,
    "email" STRING NOT NULL,
    "password" STRING NOT NULL,
    "nombre" STRING NOT NULL,
    "rol" STRING NOT NULL DEFAULT 'SUPER_ADMIN',
    "activo" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" STRING NOT NULL,
    "nombre" STRING NOT NULL,
    "email" STRING NOT NULL,
    "password" STRING NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'ADMIN_NEGOCIO',
    "primerLogin" BOOL NOT NULL DEFAULT true,
    "activo" BOOL NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" STRING NOT NULL,
    "token" STRING NOT NULL,
    "usuarioId" STRING NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usado" BOOL NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Negocio" (
    "id" STRING NOT NULL,
    "nombre" STRING NOT NULL,
    "telefono" STRING NOT NULL,
    "logo" STRING,
    "descripcion" STRING,
    "direccion" STRING,
    "googleMapsUrl" STRING,
    "usuarioId" STRING NOT NULL,
    "estadoSuscripcion" "EstadoSuscripcion" NOT NULL DEFAULT 'SIN_SUSCRIPCION',
    "fechaRegistro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueado" BOOL NOT NULL DEFAULT false,
    "motivoBloqueo" STRING,
    "codigoAplicado" BOOL NOT NULL DEFAULT false,
    "linkPublico" STRING,
    "agendaPublica" BOOL NOT NULL DEFAULT true,
    "mostrarPreciosPublico" BOOL NOT NULL DEFAULT true,
    "limiteSucursales" INT4,
    "limiteEmpleados" INT4,
    "limiteServicios" INT4,
    "limiteClientes" INT4,
    "limiteCitasMes" INT4,
    "limiteWhatsAppMes" INT4,
    "limiteEmailMes" INT4,
    "reportesAvanzados" BOOL NOT NULL DEFAULT false,
    "notificacionesWhatsApp" BOOL NOT NULL DEFAULT true,
    "notificacionesEmail" BOOL NOT NULL DEFAULT true,
    "recordatoriosAutomaticos" BOOL NOT NULL DEFAULT true,
    "recordatorio1" INT4 DEFAULT 1440,
    "recordatorio2" INT4,
    "recordatorio3" INT4,
    "recordatorio4" INT4,
    "recordatorio5" INT4,
    "mensajeRecordatorio" STRING DEFAULT 'Hola {cliente}, tu cita ha sido confirmada para el {fecha} a las {hora} en {negocio}. ¡Te esperamos!',
    "mensajeReagendamiento" STRING DEFAULT 'Hola {cliente}, te recordamos tu cita el {fecha} a las {hora} en {negocio}. No faltes!',
    "whatsappInstanceId" STRING,
    "whatsappConnected" BOOL NOT NULL DEFAULT false,
    "whatsappPhoneNumber" STRING,
    "whatsappQrCode" STRING,
    "whatsappConfiguredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" STRING NOT NULL,
    "negocioId" STRING NOT NULL,
    "codigoId" STRING NOT NULL,
    "fechaActivacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "activa" BOOL NOT NULL DEFAULT true,
    "renovacionAuto" BOOL NOT NULL DEFAULT false,
    "planPendiente" STRING,
    "codigoPendienteId" STRING,
    "fechaInicioPendiente" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodigoSuscripcion" (
    "id" STRING NOT NULL,
    "codigo" STRING NOT NULL,
    "plan" "PlanSuscripcion" NOT NULL DEFAULT 'GRATIS',
    "duracionDias" INT4 NOT NULL,
    "descripcion" STRING,
    "precio" DECIMAL(10,2),
    "usado" BOOL NOT NULL DEFAULT false,
    "fechaUso" TIMESTAMP(3),
    "fechaExpiracion" TIMESTAMP(3),
    "usoMaximo" INT4 NOT NULL DEFAULT 1,
    "vecesUsado" INT4 NOT NULL DEFAULT 0,
    "motivoCreacion" STRING,
    "notas" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodigoSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialSuscripcion" (
    "id" STRING NOT NULL,
    "suscripcionId" STRING NOT NULL,
    "accion" "AccionSuscripcion" NOT NULL,
    "descripcion" STRING NOT NULL,
    "codigoUsado" STRING,
    "realizadoPor" STRING,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" STRING NOT NULL,
    "nombre" STRING NOT NULL,
    "cedula" STRING NOT NULL,
    "telefono" STRING NOT NULL,
    "email" STRING,
    "notas" STRING,
    "negocioId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" STRING NOT NULL,
    "nombre" STRING NOT NULL,
    "cargo" STRING NOT NULL,
    "telefono" STRING NOT NULL,
    "email" STRING NOT NULL,
    "foto" STRING,
    "estado" "EstadoEmpleado" NOT NULL DEFAULT 'ACTIVO',
    "negocioId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioEmpleado" (
    "id" STRING NOT NULL,
    "empleadoId" STRING NOT NULL,
    "diaSemana" INT4 NOT NULL,
    "horaInicio" STRING NOT NULL,
    "horaFin" STRING NOT NULL,
    "tieneDescanso" BOOL NOT NULL DEFAULT false,
    "descansoInicio" STRING,
    "descansoFin" STRING,

    CONSTRAINT "HorarioEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloqueoEmpleado" (
    "id" STRING NOT NULL,
    "empleadoId" STRING NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "motivo" STRING,
    "todoElDia" BOOL NOT NULL DEFAULT true,
    "horaInicio" STRING,
    "horaFin" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueoEmpleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" STRING NOT NULL,
    "nombre" STRING NOT NULL,
    "direccion" STRING NOT NULL,
    "ciudad" STRING,
    "provincia" STRING,
    "telefono" STRING NOT NULL,
    "email" STRING,
    "googleMapsUrl" STRING,
    "estado" "EstadoSucursal" NOT NULL DEFAULT 'ACTIVA',
    "negocioId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioSucursal" (
    "id" STRING NOT NULL,
    "sucursalId" STRING NOT NULL,
    "diaSemana" INT4 NOT NULL,
    "abierto" BOOL NOT NULL DEFAULT true,
    "horaApertura" STRING,
    "horaCierre" STRING,
    "tieneDescanso" BOOL NOT NULL DEFAULT false,
    "descansoInicio" STRING,
    "descansoFin" STRING,

    CONSTRAINT "HorarioSucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servicio" (
    "id" STRING NOT NULL,
    "nombre" STRING NOT NULL,
    "descripcion" STRING NOT NULL,
    "duracion" INT4 NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "foto" STRING,
    "color" STRING NOT NULL DEFAULT '#3b82f6',
    "estado" "EstadoServicio" NOT NULL DEFAULT 'ACTIVO',
    "negocioId" STRING NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" STRING NOT NULL,
    "fecha" DATE NOT NULL,
    "horaInicio" STRING NOT NULL,
    "horaFin" STRING NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'PENDIENTE',
    "notas" STRING,
    "precioTotal" DECIMAL(10,2) NOT NULL,
    "canalOrigen" "CanalOrigen" NOT NULL DEFAULT 'MANUAL',
    "clienteId" STRING NOT NULL,
    "servicioId" STRING NOT NULL,
    "empleadoId" STRING,
    "sucursalId" STRING NOT NULL,
    "negocioId" STRING NOT NULL,
    "recordatorioEnviado" BOOL NOT NULL DEFAULT false,
    "recordatorioEnviadoEn" TIMESTAMP(3),
    "creadoPor" STRING,
    "modificadoPor" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpleadoSucursal" (
    "empleadoId" STRING NOT NULL,
    "sucursalId" STRING NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmpleadoSucursal_pkey" PRIMARY KEY ("empleadoId","sucursalId")
);

-- CreateTable
CREATE TABLE "ServicioSucursal" (
    "servicioId" STRING NOT NULL,
    "sucursalId" STRING NOT NULL,
    "disponible" BOOL NOT NULL DEFAULT true,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicioSucursal_pkey" PRIMARY KEY ("servicioId","sucursalId")
);

-- CreateTable
CREATE TABLE "UsoRecursos" (
    "id" STRING NOT NULL,
    "negocioId" STRING NOT NULL,
    "cicloInicio" TIMESTAMP(3) NOT NULL,
    "cicloFin" TIMESTAMP(3) NOT NULL,
    "citasCreadas" INT4 NOT NULL DEFAULT 0,
    "whatsappEnviados" INT4 NOT NULL DEFAULT 0,
    "emailsEnviados" INT4 NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsoRecursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionPlanes" (
    "id" STRING NOT NULL,
    "plan" "PlanSuscripcion" NOT NULL,
    "limiteSucursales" INT4,
    "limiteEmpleados" INT4,
    "limiteServicios" INT4,
    "limiteClientes" INT4,
    "limiteCitasMes" INT4,
    "limiteWhatsAppMes" INT4,
    "limiteEmailMes" INT4,
    "reportesAvanzados" BOOL NOT NULL DEFAULT false,
    "duracionDias" INT4 NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "nombre" STRING NOT NULL,
    "descripcion" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionPlanes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroEnvio" (
    "id" STRING NOT NULL,
    "negocioId" STRING NOT NULL,
    "tipo" "TipoEnvio" NOT NULL,
    "destinatario" STRING NOT NULL,
    "asunto" STRING,
    "exitoso" BOOL NOT NULL DEFAULT true,
    "error" STRING,
    "citaId" STRING,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionGlobal" (
    "id" STRING NOT NULL,
    "clave" STRING NOT NULL,
    "valor" STRING NOT NULL,
    "tipo" STRING NOT NULL,
    "descripcion" STRING,
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
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_usuarioId_idx" ON "PasswordResetToken"("usuarioId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_usado_idx" ON "PasswordResetToken"("usado");

-- CreateIndex
CREATE UNIQUE INDEX "Negocio_usuarioId_key" ON "Negocio"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Negocio_linkPublico_key" ON "Negocio"("linkPublico");

-- CreateIndex
CREATE INDEX "Negocio_usuarioId_idx" ON "Negocio"("usuarioId");

-- CreateIndex
CREATE INDEX "Negocio_estadoSuscripcion_idx" ON "Negocio"("estadoSuscripcion");

-- CreateIndex
CREATE INDEX "Negocio_bloqueado_idx" ON "Negocio"("bloqueado");

-- CreateIndex
CREATE INDEX "Negocio_codigoAplicado_idx" ON "Negocio"("codigoAplicado");

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
CREATE INDEX "Suscripcion_planPendiente_idx" ON "Suscripcion"("planPendiente");

-- CreateIndex
CREATE INDEX "Suscripcion_fechaInicioPendiente_idx" ON "Suscripcion"("fechaInicioPendiente");

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
CREATE INDEX "Cliente_cedula_idx" ON "Cliente"("cedula");

-- CreateIndex
CREATE INDEX "Cliente_telefono_idx" ON "Cliente"("telefono");

-- CreateIndex
CREATE INDEX "Cliente_email_idx" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "Cliente_nombre_idx" ON "Cliente"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_negocioId_telefono_key" ON "Cliente"("negocioId", "telefono");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_negocioId_cedula_key" ON "Cliente"("negocioId", "cedula");

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
CREATE INDEX "Servicio_negocioId_idx" ON "Servicio"("negocioId");

-- CreateIndex
CREATE INDEX "Servicio_estado_idx" ON "Servicio"("estado");

-- CreateIndex
CREATE INDEX "Servicio_nombre_idx" ON "Servicio"("nombre");

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
CREATE INDEX "UsoRecursos_negocioId_cicloInicio_cicloFin_idx" ON "UsoRecursos"("negocioId", "cicloInicio", "cicloFin");

-- CreateIndex
CREATE UNIQUE INDEX "UsoRecursos_negocioId_cicloInicio_key" ON "UsoRecursos"("negocioId", "cicloInicio");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionPlanes_plan_key" ON "ConfiguracionPlanes"("plan");

-- CreateIndex
CREATE INDEX "ConfiguracionPlanes_plan_idx" ON "ConfiguracionPlanes"("plan");

-- CreateIndex
CREATE INDEX "RegistroEnvio_negocioId_idx" ON "RegistroEnvio"("negocioId");

-- CreateIndex
CREATE INDEX "RegistroEnvio_tipo_idx" ON "RegistroEnvio"("tipo");

-- CreateIndex
CREATE INDEX "RegistroEnvio_createdAt_idx" ON "RegistroEnvio"("createdAt");

-- CreateIndex
CREATE INDEX "RegistroEnvio_citaId_idx" ON "RegistroEnvio"("citaId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionGlobal_clave_key" ON "ConfiguracionGlobal"("clave");

-- CreateIndex
CREATE INDEX "ConfiguracionGlobal_clave_idx" ON "ConfiguracionGlobal"("clave");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Negocio" ADD CONSTRAINT "Negocio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_codigoId_fkey" FOREIGN KEY ("codigoId") REFERENCES "CodigoSuscripcion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_codigoPendienteId_fkey" FOREIGN KEY ("codigoPendienteId") REFERENCES "CodigoSuscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "EmpleadoSucursal" ADD CONSTRAINT "EmpleadoSucursal_empleadoId_fkey" FOREIGN KEY ("empleadoId") REFERENCES "Empleado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpleadoSucursal" ADD CONSTRAINT "EmpleadoSucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioSucursal" ADD CONSTRAINT "ServicioSucursal_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioSucursal" ADD CONSTRAINT "ServicioSucursal_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsoRecursos" ADD CONSTRAINT "UsoRecursos_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEnvio" ADD CONSTRAINT "RegistroEnvio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEnvio" ADD CONSTRAINT "RegistroEnvio_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
