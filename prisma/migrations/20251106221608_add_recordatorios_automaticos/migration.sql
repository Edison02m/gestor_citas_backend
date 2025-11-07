-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordatorioEnviadoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "recordatoriosAutomaticos" BOOLEAN NOT NULL DEFAULT true;
