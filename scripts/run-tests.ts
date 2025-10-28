// scripts/run-tests.ts
// Script para ejecutar las pruebas de CitaService

import { runAllTests } from '../src/tests/cita.service.test';

console.log('🔧 Compilando TypeScript y ejecutando pruebas...\n');

runAllTests()
  .then(() => {
    console.log('\n✅ Pruebas finalizadas exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando pruebas:', error);
    process.exit(1);
  });
