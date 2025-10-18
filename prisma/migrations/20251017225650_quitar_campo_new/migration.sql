/*
  Warnings:

  - You are about to drop the column `fechaVencimiento` on the `Negocio` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Negocio_fechaVencimiento_idx";

-- AlterTable
ALTER TABLE "Negocio" DROP COLUMN "fechaVencimiento";
