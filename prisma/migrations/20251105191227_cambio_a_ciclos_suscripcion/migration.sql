/*
  Warnings:

  - You are about to drop the column `anio` on the `UsoRecursos` table. All the data in the column will be lost.
  - You are about to drop the column `mes` on the `UsoRecursos` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[negocioId,cicloInicio]` on the table `UsoRecursos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cicloFin` to the `UsoRecursos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cicloInicio` to the `UsoRecursos` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new columns as nullable first
ALTER TABLE "UsoRecursos" ADD COLUMN "cicloInicio" TIMESTAMP(3);
ALTER TABLE "UsoRecursos" ADD COLUMN "cicloFin" TIMESTAMP(3);

-- Step 2: Migrate existing data
-- For each UsoRecursos record, calculate cicloInicio and cicloFin based on:
-- 1. Get the business's active subscription fechaActivacion
-- 2. Calculate which cycle the mes/anio falls into based on subscription start date
-- 3. If no active subscription, use the first day of mes/anio as cicloInicio and last day as cicloFin

UPDATE "UsoRecursos" ur
SET 
  "cicloInicio" = CASE
    -- If there's an active subscription, calculate cycle based on fechaActivacion
    WHEN s."fechaActivacion" IS NOT NULL THEN
      -- Calculate the cycle start date that contains this month/year
      s."fechaActivacion" + 
      (INTERVAL '1 day' * 
        FLOOR(
          EXTRACT(EPOCH FROM (
            make_date(ur."anio", ur."mes", 1) - s."fechaActivacion"
          )) / 86400 / 
          CASE 
            WHEN cs."plan" IN ('PRO_MENSUAL', 'PRO_PLUS_MENSUAL') THEN 30
            WHEN cs."plan" IN ('PRO_ANUAL', 'PRO_PLUS_ANUAL') THEN 365
            ELSE 30  -- Default to 30 days for GRATIS
          END
        ) * 
        CASE 
          WHEN cs."plan" IN ('PRO_MENSUAL', 'PRO_PLUS_MENSUAL') THEN 30
          WHEN cs."plan" IN ('PRO_ANUAL', 'PRO_PLUS_ANUAL') THEN 365
          ELSE 30
        END
      )
    -- If no subscription, use first day of the month
    ELSE make_date(ur."anio", ur."mes", 1)
  END,
  "cicloFin" = CASE
    -- If there's an active subscription, calculate cycle end based on fechaActivacion
    WHEN s."fechaActivacion" IS NOT NULL THEN
      s."fechaActivacion" + 
      (INTERVAL '1 day' * 
        (FLOOR(
          EXTRACT(EPOCH FROM (
            make_date(ur."anio", ur."mes", 1) - s."fechaActivacion"
          )) / 86400 / 
          CASE 
            WHEN cs."plan" IN ('PRO_MENSUAL', 'PRO_PLUS_MENSUAL') THEN 30
            WHEN cs."plan" IN ('PRO_ANUAL', 'PRO_PLUS_ANUAL') THEN 365
            ELSE 30
          END
        ) + 1) * 
        CASE 
          WHEN cs."plan" IN ('PRO_MENSUAL', 'PRO_PLUS_MENSUAL') THEN 30
          WHEN cs."plan" IN ('PRO_ANUAL', 'PRO_PLUS_ANUAL') THEN 365
          ELSE 30
        END
      ) - INTERVAL '1 second'
    -- If no subscription, use last day of the month
    ELSE (make_date(ur."anio", ur."mes", 1) + INTERVAL '1 month' - INTERVAL '1 second')
  END
FROM "Suscripcion" s
LEFT JOIN "CodigoSuscripcion" cs ON s."codigoId" = cs."id"
WHERE ur."negocioId" = s."negocioId"
  AND s."activa" = true
  AND s."fechaActivacion" <= make_date(ur."anio", ur."mes", 1)
  AND (s."fechaVencimiento" IS NULL OR s."fechaVencimiento" >= make_date(ur."anio", ur."mes", 1));

-- For records without an active subscription, set default values
UPDATE "UsoRecursos"
SET 
  "cicloInicio" = make_date("anio", "mes", 1),
  "cicloFin" = (make_date("anio", "mes", 1) + INTERVAL '1 month' - INTERVAL '1 second')
WHERE "cicloInicio" IS NULL;

-- Step 3: Make columns NOT NULL
ALTER TABLE "UsoRecursos" ALTER COLUMN "cicloInicio" SET NOT NULL;
ALTER TABLE "UsoRecursos" ALTER COLUMN "cicloFin" SET NOT NULL;

-- Step 4: Drop old indexes
DROP INDEX IF EXISTS "UsoRecursos_negocioId_anio_mes_idx";
DROP INDEX IF EXISTS "UsoRecursos_negocioId_mes_anio_key";

-- Step 5: Drop old columns
ALTER TABLE "UsoRecursos" DROP COLUMN "anio";
ALTER TABLE "UsoRecursos" DROP COLUMN "mes";

-- Step 6: Create new indexes
CREATE INDEX "UsoRecursos_negocioId_cicloInicio_cicloFin_idx" ON "UsoRecursos"("negocioId", "cicloInicio", "cicloFin");
CREATE UNIQUE INDEX "UsoRecursos_negocioId_cicloInicio_key" ON "UsoRecursos"("negocioId", "cicloInicio");

