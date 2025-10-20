/*
  Warnings:

  - You are about to drop the column `latitud` on the `Sucursal` table. All the data in the column will be lost.
  - You are about to drop the column `linkMaps` on the `Sucursal` table. All the data in the column will be lost.
  - You are about to drop the column `longitud` on the `Sucursal` table. All the data in the column will be lost.
  - You are about to drop the `FotoSucursal` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FotoSucursal" DROP CONSTRAINT "FotoSucursal_sucursalId_fkey";

-- AlterTable
ALTER TABLE "Cita" ALTER COLUMN "empleadoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Sucursal" DROP COLUMN "latitud",
DROP COLUMN "linkMaps",
DROP COLUMN "longitud";

-- DropTable
DROP TABLE "FotoSucursal";
