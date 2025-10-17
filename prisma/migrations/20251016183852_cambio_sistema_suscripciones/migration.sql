/*
  Warnings:

  - The values [PRUEBA_GRATIS] on the enum `EstadoSuscripcion` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `fechaFinPrueba` on the `Negocio` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EstadoSuscripcion_new" AS ENUM ('SIN_SUSCRIPCION', 'ACTIVA', 'VENCIDA', 'BLOQUEADA', 'CANCELADA');
ALTER TABLE "Negocio" ALTER COLUMN "estadoSuscripcion" DROP DEFAULT;
ALTER TABLE "Negocio" ALTER COLUMN "estadoSuscripcion" TYPE "EstadoSuscripcion_new" USING ("estadoSuscripcion"::text::"EstadoSuscripcion_new");
ALTER TYPE "EstadoSuscripcion" RENAME TO "EstadoSuscripcion_old";
ALTER TYPE "EstadoSuscripcion_new" RENAME TO "EstadoSuscripcion";
DROP TYPE "EstadoSuscripcion_old";
ALTER TABLE "Negocio" ALTER COLUMN "estadoSuscripcion" SET DEFAULT 'SIN_SUSCRIPCION';
COMMIT;

-- DropIndex
DROP INDEX "Negocio_fechaFinPrueba_idx";

-- AlterTable
ALTER TABLE "Negocio" DROP COLUMN "fechaFinPrueba",
ADD COLUMN     "codigoAplicado" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "estadoSuscripcion" SET DEFAULT 'SIN_SUSCRIPCION';

-- CreateIndex
CREATE INDEX "Negocio_codigoAplicado_idx" ON "Negocio"("codigoAplicado");
