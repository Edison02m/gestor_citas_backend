-- AlterTable
ALTER TABLE "Negocio" ADD COLUMN     "whatsappConfiguredAt" TIMESTAMP(3),
ADD COLUMN     "whatsappConnected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappInstanceId" TEXT,
ADD COLUMN     "whatsappPhoneNumber" TEXT,
ADD COLUMN     "whatsappQrCode" TEXT;
