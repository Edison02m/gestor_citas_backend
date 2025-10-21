/*
  Warnings:

  - A unique constraint covering the columns `[negocioId,cedula]` on the table `Cliente` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Cliente_cedula_key";

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_negocioId_cedula_key" ON "Cliente"("negocioId", "cedula");
