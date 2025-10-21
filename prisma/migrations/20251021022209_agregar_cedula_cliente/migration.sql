/*
  Warnings:

  - A unique constraint covering the columns `[cedula]` on the table `Cliente` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cedula` to the `Cliente` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "cedula" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_cedula_key" ON "Cliente"("cedula");

-- CreateIndex
CREATE INDEX "Cliente_cedula_idx" ON "Cliente"("cedula");
