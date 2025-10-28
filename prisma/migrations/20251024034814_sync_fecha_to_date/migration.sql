/*
  Warnings:

  - Changed the type of `fecha` on the `Cita` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Cita" DROP COLUMN "fecha",
ADD COLUMN     "fecha" DATE NOT NULL;

-- CreateIndex
CREATE INDEX "Cita_fecha_idx" ON "Cita"("fecha");

-- CreateIndex
CREATE INDEX "Cita_empleadoId_fecha_idx" ON "Cita"("empleadoId", "fecha");

-- CreateIndex
CREATE INDEX "Cita_sucursalId_fecha_idx" ON "Cita"("sucursalId", "fecha");
