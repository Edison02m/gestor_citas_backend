/*
  Warnings:

  - You are about to drop the column `idioma` on the `Negocio` table. All the data in the column will be lost.
  - You are about to drop the column `moneda` on the `Negocio` table. All the data in the column will be lost.
  - You are about to drop the column `recordatorio1h` on the `Negocio` table. All the data in the column will be lost.
  - You are about to drop the column `recordatorio24h` on the `Negocio` table. All the data in the column will be lost.
  - You are about to drop the column `zonaHoraria` on the `Negocio` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Negocio" DROP COLUMN "idioma",
DROP COLUMN "moneda",
DROP COLUMN "recordatorio1h",
DROP COLUMN "recordatorio24h",
DROP COLUMN "zonaHoraria",
ADD COLUMN     "mensajeReagendamiento" TEXT DEFAULT 'Hola {cliente}, tu cita ha sido reagendada para el {fecha} a las {hora}. Gracias por tu comprensión.',
ADD COLUMN     "mensajeRecordatorio" TEXT DEFAULT 'Hola {cliente}, te recordamos tu cita el {fecha} a las {hora} en {negocio}. ¡Te esperamos!',
ADD COLUMN     "recordatorio1" INTEGER DEFAULT 1440,
ADD COLUMN     "recordatorio2" INTEGER;
