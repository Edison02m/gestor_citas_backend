/*
  Warnings:

  - You are about to drop the `RegistroEmail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RegistroWhatsApp` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoEnvio" AS ENUM ('EMAIL', 'WHATSAPP');

-- DropForeignKey
ALTER TABLE "public"."RegistroEmail" DROP CONSTRAINT "RegistroEmail_negocioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."RegistroWhatsApp" DROP CONSTRAINT "RegistroWhatsApp_negocioId_fkey";

-- DropTable
DROP TABLE "public"."RegistroEmail";

-- DropTable
DROP TABLE "public"."RegistroWhatsApp";

-- CreateTable
CREATE TABLE "RegistroEnvio" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "tipo" "TipoEnvio" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT,
    "exitoso" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "citaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroEnvio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroEnvio_negocioId_idx" ON "RegistroEnvio"("negocioId");

-- CreateIndex
CREATE INDEX "RegistroEnvio_tipo_idx" ON "RegistroEnvio"("tipo");

-- CreateIndex
CREATE INDEX "RegistroEnvio_createdAt_idx" ON "RegistroEnvio"("createdAt");

-- CreateIndex
CREATE INDEX "RegistroEnvio_citaId_idx" ON "RegistroEnvio"("citaId");

-- AddForeignKey
ALTER TABLE "RegistroEnvio" ADD CONSTRAINT "RegistroEnvio_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEnvio" ADD CONSTRAINT "RegistroEnvio_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;
