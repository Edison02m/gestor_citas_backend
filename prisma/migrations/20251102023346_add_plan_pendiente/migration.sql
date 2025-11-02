-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccionSuscripcion" ADD VALUE 'PLAN_EN_COLA';
ALTER TYPE "AccionSuscripcion" ADD VALUE 'PLAN_ACTIVADO_AUTOMATICAMENTE';

-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN     "codigoPendienteId" TEXT,
ADD COLUMN     "fechaInicioPendiente" TIMESTAMP(3),
ADD COLUMN     "planPendiente" TEXT;

-- CreateIndex
CREATE INDEX "Suscripcion_planPendiente_idx" ON "Suscripcion"("planPendiente");

-- CreateIndex
CREATE INDEX "Suscripcion_fechaInicioPendiente_idx" ON "Suscripcion"("fechaInicioPendiente");

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_codigoPendienteId_fkey" FOREIGN KEY ("codigoPendienteId") REFERENCES "CodigoSuscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
