-- AlterTable
ALTER TABLE "HorarioSucursal" ADD COLUMN     "descansoFin" TEXT,
ADD COLUMN     "descansoInicio" TEXT,
ADD COLUMN     "tieneDescanso" BOOLEAN NOT NULL DEFAULT false;
