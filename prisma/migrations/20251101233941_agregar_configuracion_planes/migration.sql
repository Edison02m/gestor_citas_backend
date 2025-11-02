-- AlterTable
ALTER TABLE "CodigoSuscripcion" ALTER COLUMN "duracionDias" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ConfiguracionPlanes" (
    "id" TEXT NOT NULL,
    "plan" "PlanSuscripcion" NOT NULL,
    "limiteSucursales" INTEGER,
    "limiteEmpleados" INTEGER,
    "limiteServicios" INTEGER,
    "limiteClientes" INTEGER,
    "limiteCitasMes" INTEGER,
    "limiteWhatsAppMes" INTEGER,
    "reportesAvanzados" BOOLEAN NOT NULL DEFAULT false,
    "duracionDias" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionPlanes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionPlanes_plan_key" ON "ConfiguracionPlanes"("plan");

-- CreateIndex
CREATE INDEX "ConfiguracionPlanes_plan_idx" ON "ConfiguracionPlanes"("plan");
