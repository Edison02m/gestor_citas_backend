/*
  Warnings:

  - You are about to drop the column `extrasSeleccionados` on the `Cita` table. All the data in the column will be lost.
  - You are about to drop the `NotificacionCita` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."NotificacionCita" DROP CONSTRAINT "NotificacionCita_citaId_fkey";

-- AlterTable
ALTER TABLE "Cita" DROP COLUMN "extrasSeleccionados";

-- DropTable
DROP TABLE "public"."NotificacionCita";

-- DropEnum
DROP TYPE "public"."CanalNotificacion";

-- DropEnum
DROP TYPE "public"."EstadoNotificacion";

-- DropEnum
DROP TYPE "public"."TipoNotificacion";
