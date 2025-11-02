-- CreateTable
CREATE TABLE "RegistroEmail" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "citaId" TEXT,
    "para" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroWhatsApp" (
    "id" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "citaId" TEXT,
    "para" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "exitoso" BOOLEAN NOT NULL DEFAULT true,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroEmail_negocioId_idx" ON "RegistroEmail"("negocioId");

-- CreateIndex
CREATE INDEX "RegistroEmail_createdAt_idx" ON "RegistroEmail"("createdAt");

-- CreateIndex
CREATE INDEX "RegistroEmail_negocioId_createdAt_idx" ON "RegistroEmail"("negocioId", "createdAt");

-- CreateIndex
CREATE INDEX "RegistroWhatsApp_negocioId_idx" ON "RegistroWhatsApp"("negocioId");

-- CreateIndex
CREATE INDEX "RegistroWhatsApp_createdAt_idx" ON "RegistroWhatsApp"("createdAt");

-- CreateIndex
CREATE INDEX "RegistroWhatsApp_negocioId_createdAt_idx" ON "RegistroWhatsApp"("negocioId", "createdAt");

-- AddForeignKey
ALTER TABLE "RegistroEmail" ADD CONSTRAINT "RegistroEmail_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroWhatsApp" ADD CONSTRAINT "RegistroWhatsApp_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
