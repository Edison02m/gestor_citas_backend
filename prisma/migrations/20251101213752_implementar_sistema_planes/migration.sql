/*
  Warnings:

  - The values [MENSUAL,TRIMESTRAL,SEMESTRAL,ANUAL,PRUEBA] on the enum `PlanSuscripcion` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `duracionMeses` on the `CodigoSuscripcion` table. All the data in the column will be lost.
  - Added the required column `duracionDias` to the `CodigoSuscripcion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanSuscripcion_new" AS ENUM ('GRATIS', 'PRO_MENSUAL', 'PRO_ANUAL', 'PRO_PLUS_MENSUAL', 'PRO_PLUS_ANUAL', 'PERSONALIZADO');
ALTER TABLE "public"."CodigoSuscripcion" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "CodigoSuscripcion" ALTER COLUMN "plan" TYPE "PlanSuscripcion_new" USING ("plan"::text::"PlanSuscripcion_new");
ALTER TYPE "PlanSuscripcion" RENAME TO "PlanSuscripcion_old";
ALTER TYPE "PlanSuscripcion_new" RENAME TO "PlanSuscripcion";
DROP TYPE "public"."PlanSuscripcion_old";
ALTER TABLE "CodigoSuscripcion" ALTER COLUMN "plan" SET DEFAULT 'GRATIS';
COMMIT;

-- AlterTable - Paso 1: Agregar duracionDias con valor por defecto temporal
ALTER TABLE "CodigoSuscripcion" 
ADD COLUMN "duracionDias" INTEGER NOT NULL DEFAULT 14;

-- Paso 2: Migrar datos existentes de duracionMeses a duracionDias (1 mes = 30 días)
UPDATE "CodigoSuscripcion" 
SET "duracionDias" = "duracionMeses" * 30 
WHERE "duracionMeses" IS NOT NULL;

-- Paso 3: Actualizar planes antiguos a nuevos (mapeo manual)
-- PRUEBA (7-14 días) -> GRATIS (14 días)
UPDATE "CodigoSuscripcion" SET "plan" = 'GRATIS' WHERE "plan"::text = 'PRUEBA';

-- MENSUAL (1 mes = 30 días) -> PRO_MENSUAL
UPDATE "CodigoSuscripcion" SET "plan" = 'PRO_MENSUAL', "duracionDias" = 30 
WHERE "plan"::text = 'MENSUAL';

-- TRIMESTRAL (3 meses = 90 días) -> PRO_MENSUAL (se convierte a mensual)
UPDATE "CodigoSuscripcion" SET "plan" = 'PRO_MENSUAL', "duracionDias" = 90 
WHERE "plan"::text = 'TRIMESTRAL';

-- SEMESTRAL (6 meses = 180 días) -> PRO_ANUAL (se convierte a anual proporcionalmente)
UPDATE "CodigoSuscripcion" SET "plan" = 'PRO_ANUAL', "duracionDias" = 180 
WHERE "plan"::text = 'SEMESTRAL';

-- ANUAL (12 meses = 365 días) -> PRO_ANUAL
UPDATE "CodigoSuscripcion" SET "plan" = 'PRO_ANUAL', "duracionDias" = 365 
WHERE "plan"::text = 'ANUAL';

-- Paso 4: Eliminar columna duracionMeses
ALTER TABLE "CodigoSuscripcion" 
DROP COLUMN "duracionMeses",
ALTER COLUMN "plan" SET DEFAULT 'GRATIS';

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "limiteCitasMes" INTEGER,
ADD COLUMN     "limiteClientes" INTEGER,
ADD COLUMN     "limiteEmpleados" INTEGER,
ADD COLUMN     "limiteServicios" INTEGER,
ADD COLUMN     "limiteSucursales" INTEGER,
ADD COLUMN     "limiteWhatsAppMes" INTEGER,
ADD COLUMN     "recordatorio3" INTEGER,
ADD COLUMN     "recordatorio4" INTEGER,
ADD COLUMN     "recordatorio5" INTEGER,
ADD COLUMN     "reportesAvanzados" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UsoRecursos" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "citasCreadas" INTEGER NOT NULL DEFAULT 0,
    "whatsappEnviados" INTEGER NOT NULL DEFAULT 0,
    "emailsEnviados" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsoRecursos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsoRecursos_negocioId_anio_mes_idx" ON "UsoRecursos"("negocioId", "anio", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "UsoRecursos_negocioId_mes_anio_key" ON "UsoRecursos"("negocioId", "mes", "anio");

-- AddForeignKey
ALTER TABLE "UsoRecursos" ADD CONSTRAINT "UsoRecursos_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
