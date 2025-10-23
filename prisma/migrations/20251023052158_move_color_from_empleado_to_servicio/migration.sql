/*
  Warnings:

  - You are about to drop the column `color` on the `Empleado` table. All the data in the column will be lost.
  - You are about to drop the `ServicioExtra` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."ServicioExtra" DROP CONSTRAINT "ServicioExtra_servicioId_fkey";

-- AlterTable
ALTER TABLE "Empleado" DROP COLUMN "color";

-- AlterTable
ALTER TABLE "Servicio" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#3b82f6';

-- DropTable
DROP TABLE "public"."ServicioExtra";
