/*
  Warnings:

  - A unique constraint covering the columns `[linkPublico]` on the table `Negocio` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "CanalOrigen" ADD VALUE 'WEB_PUBLICA';

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "agendaPublica" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "linkPublico" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Negocio_linkPublico_key" ON "Negocio"("linkPublico");
