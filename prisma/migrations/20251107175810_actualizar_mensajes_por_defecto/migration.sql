-- AlterTable
ALTER TABLE "Negocio" ALTER COLUMN "mensajeReagendamiento" SET DEFAULT 'Hola {cliente}, te recordamos tu cita el {fecha} a las {hora} en {negocio}. No faltes!',
ALTER COLUMN "mensajeRecordatorio" SET DEFAULT 'Hola {cliente}, tu cita ha sido confirmada para el {fecha} a las {hora} en {negocio}. ¡Te esperamos!';

-- Actualizar registros existentes con los nuevos mensajes por defecto
UPDATE "Negocio"
SET 
  "mensajeRecordatorio" = 'Hola {cliente}, tu cita ha sido confirmada para el {fecha} a las {hora} en {negocio}. ¡Te esperamos!',
  "mensajeReagendamiento" = 'Hola {cliente}, te recordamos tu cita el {fecha} a las {hora} en {negocio}. No faltes!'
WHERE "mensajeRecordatorio" = 'Hola {cliente}, te recordamos tu cita el {fecha} a las {hora} en {negocio}. ¡Te esperamos!'
   OR "mensajeReagendamiento" = 'Hola {cliente}, tu cita ha sido reagendada para el {fecha} a las {hora}. Gracias por tu comprensión.';
