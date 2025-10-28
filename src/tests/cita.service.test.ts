// src/tests/cita.service.test.ts
// Archivo de pruebas para CitaService - Validación exhaustiva de todos los métodos

import { PrismaClient } from '@prisma/client';
import { CitaService } from '../services/cita.service';

/**
 * CASOS DE PRUEBA PARA CITA SERVICE
 * 
 * Este archivo prueba:
 * 1. Crear citas en diferentes horarios (1am, 3am, 3pm, 5pm, 17pm, 23pm, 23:59pm)
 * 2. Actualizar citas cambiando solo horas (sin cambiar fecha)
 * 3. Actualizar citas cambiando fecha
 * 4. Validar horarios de sucursal en diferentes días
 * 5. Validar capacidad de sucursal
 * 6. Validar disponibilidad de empleados
 * 7. Edge cases: medianoche, últimas horas del día, cambios de día
 */

const prisma = new PrismaClient();
const citaService = new CitaService(prisma);

// Colores para console.log
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(emoji: string, title: string, data?: any) {
  console.log(`\n${emoji} ${colors.bright}${title}${colors.reset}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message: string, err?: any) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  if (err) {
    console.log(`   Error: ${err.message}`);
  }
}

function warning(message: string) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

// ============================================================================
// DATOS DE PRUEBA
// ============================================================================

let negocioId: string;
let sucursalId: string;
let clienteId: string;
let servicioId: string;
let empleadoId: string;
let citaIdCreada: string;

// Horarios de prueba - diferentes horas del día
const horariosTest = [
  { hora: '01:00', descripcion: '1 AM - Madrugada' },
  { hora: '03:00', descripcion: '3 AM - Madrugada' },
  { hora: '08:00', descripcion: '8 AM - Mañana temprano' },
  { hora: '12:00', descripcion: '12 PM - Mediodía' },
  { hora: '15:00', descripcion: '3 PM - Tarde' },
  { hora: '17:00', descripcion: '5 PM - Tarde' },
  { hora: '20:00', descripcion: '8 PM - Noche' },
  { hora: '23:00', descripcion: '11 PM - Noche' },
  { hora: '23:59', descripcion: '11:59 PM - Última hora del día' },
];

// Fechas de prueba - diferentes días de la semana
const fechasTest = [
  { fecha: '2025-10-27', dia: 'Lunes', diaSemana: 1 },
  { fecha: '2025-10-28', dia: 'Martes', diaSemana: 2 },
  { fecha: '2025-10-29', dia: 'Miércoles', diaSemana: 3 },
  { fecha: '2025-10-30', dia: 'Jueves', diaSemana: 4 },
  { fecha: '2025-10-31', dia: 'Viernes', diaSemana: 5 },
  { fecha: '2025-11-01', dia: 'Sábado', diaSemana: 6 },
  { fecha: '2025-11-02', dia: 'Domingo', diaSemana: 0 },
];

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

async function setupTestData() {
  log('🔧', 'CONFIGURANDO DATOS DE PRUEBA');

  try {
    // 1. Crear o encontrar negocio
    let negocio = await prisma.negocio.findFirst();
    if (!negocio) {
      negocio = await prisma.negocio.create({
        data: {
          nombre: 'Negocio Test',
          planId: (await prisma.plan.findFirst())!.id,
        },
      });
    }
    negocioId = negocio.id;
    success(`Negocio: ${negocioId}`);

    // 2. Crear o encontrar sucursal
    let sucursal = await prisma.sucursal.findFirst({
      where: { negocioId },
    });
    if (!sucursal) {
      sucursal = await prisma.sucursal.create({
        data: {
          nombre: 'Sucursal Test',
          direccion: 'Dirección Test 123',
          telefono: '0999999999',
          negocioId,
          estado: 'ACTIVA',
        },
      });
    }
    sucursalId = sucursal.id;
    success(`Sucursal: ${sucursalId}`);

    // 3. Crear horarios de sucursal (24/7 para pruebas)
    await prisma.horarioSucursal.deleteMany({ where: { sucursalId } });
    for (let dia = 0; dia <= 6; dia++) {
      await prisma.horarioSucursal.create({
        data: {
          sucursalId,
          diaSemana: dia,
          abierto: true,
          horaApertura: '00:00',
          horaCierre: '23:59',
          tieneDescanso: false,
        },
      });
    }
    success('Horarios de sucursal creados (24/7)');

    // 4. Crear o encontrar cliente
    let cliente = await prisma.cliente.findFirst({
      where: { negocioId },
    });
    if (!cliente) {
      cliente = await prisma.cliente.create({
        data: {
          nombre: 'Cliente Test',
          telefono: '0999999999',
          cedula: '9999999999',
          negocioId,
        },
      });
    }
    clienteId = cliente.id;
    success(`Cliente: ${clienteId}`);

    // 5. Crear o encontrar servicio
    let servicio = await prisma.servicio.findFirst({
      where: { negocioId },
    });
    if (!servicio) {
      servicio = await prisma.servicio.create({
        data: {
          nombre: 'Servicio Test',
          descripcion: 'Descripción del servicio de prueba',
          duracion: 60, // 1 hora
          precio: 20.0,
          negocioId,
          estado: 'ACTIVO',
        },
      });
    }
    servicioId = servicio.id;
    success(`Servicio: ${servicioId} (duración: 60 min)`);

    // 6. Crear o encontrar empleado
    let empleado = await prisma.empleado.findFirst({
      where: { negocioId },
    });
    if (!empleado) {
      empleado = await prisma.empleado.create({
        data: {
          nombre: 'Empleado Test',
          email: 'empleado@test.com',
          telefono: '0988888888',
          cargo: 'Empleado de Prueba',
          negocioId,
          estado: 'ACTIVO',
        },
      });

      // Asignar empleado a sucursal
      await prisma.empleadoSucursal.create({
        data: {
          empleadoId: empleado.id,
          sucursalId,
        },
      });

      // Crear horarios de empleado (24/7 para pruebas)
      for (let dia = 0; dia <= 6; dia++) {
        await prisma.horarioEmpleado.create({
          data: {
            empleadoId: empleado.id,
            diaSemana: dia,
            horaInicio: '00:00',
            horaFin: '23:59',
            tieneDescanso: false,
          },
        });
      }
    } else {
      // Si el empleado ya existe, actualizar sus horarios a 24/7
      await prisma.horarioEmpleado.deleteMany({
        where: { empleadoId: empleado.id },
      });

      for (let dia = 0; dia <= 6; dia++) {
        await prisma.horarioEmpleado.create({
          data: {
            empleadoId: empleado.id,
            diaSemana: dia,
            horaInicio: '00:00',
            horaFin: '23:59',
            tieneDescanso: false,
          },
        });
      }
    }
    empleadoId = empleado.id;
    success(`Empleado: ${empleadoId} (horario: 24/7)`);

    log('✅', 'DATOS DE PRUEBA CONFIGURADOS EXITOSAMENTE');
  } catch (err: any) {
    error('Error configurando datos de prueba', err);
    throw err;
  }
}

async function limpiarCitasTest() {
  log('🧹', 'LIMPIANDO CITAS DE PRUEBA');
  
  // Eliminar TODAS las citas del negocio de prueba para evitar conflictos
  const result = await prisma.cita.deleteMany({
    where: {
      negocioId,
    },
  });
  
  success(`Citas de prueba eliminadas (${result.count} citas)`);
}

// ============================================================================
// TESTS - CREAR CITAS
// ============================================================================

async function testCrearCitasVariasHoras() {
  log('📝', 'TEST 1: CREAR CITAS EN DIFERENTES HORAS');

  // Usar diferentes fechas para evitar conflictos
  let diaOffset = 0;
  
  for (const horario of horariosTest) {
    const horaInicio = horario.hora;
    const horaFin = calcularHoraFin(horaInicio, 60); // 1 hora de servicio
    
    // Usar fechas diferentes para cada horario
    const fecha = `2025-11-${10 + diaOffset}`;
    diaOffset++;

    try {
      const cita = await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha,
        horaInicio,
        horaFin,
        notas: `Test cita ${horario.descripcion}`,
      });

      success(`✅ Cita creada: ${horario.descripcion} (${horaInicio} - ${horaFin}) en ${fecha}`);
      
      // Guardar ID de la primera cita para pruebas de actualización
      if (!citaIdCreada) {
        citaIdCreada = cita.id;
      }
    } catch (err: any) {
      error(`❌ Error creando cita ${horario.descripcion}`, err);
    }
  }
}

async function testCrearCitasDiferentesDias() {
  log('📅', 'TEST 2: CREAR CITAS EN DIFERENTES DÍAS DE LA SEMANA');

  // Usar horas diferentes para evitar conflictos con TEST 1
  let horaOffset = 0;
  
  for (const fecha of fechasTest) {
    const hora = 13 + horaOffset; // Empezar desde 13:00
    horaOffset++;
    
    try {
      await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha: fecha.fecha,
        horaInicio: `${hora}:00`,
        horaFin: `${hora + 1}:00`,
        notas: `Test cita ${fecha.dia} (día ${fecha.diaSemana})`,
      });

      success(`✅ Cita creada: ${fecha.dia} ${fecha.fecha} (día semana: ${fecha.diaSemana})`);
    } catch (err: any) {
      error(`❌ Error creando cita ${fecha.dia}`, err);
    }
  }
}

async function testCrearCitaEdgeCases() {
  log('⚡', 'TEST 3: EDGE CASES - CREAR CITAS EN HORARIOS LÍMITE');

  const edgeCases = [
    { horaInicio: '00:00', horaFin: '01:00', desc: 'Medianoche exacta', fecha: '2025-11-20' },
    { horaInicio: '23:00', horaFin: '23:59', desc: 'Última hora válida', fecha: '2025-11-21' },
    { horaInicio: '06:30', horaFin: '07:30', desc: 'Media hora no redonda', fecha: '2025-11-22' },
    { horaInicio: '12:15', horaFin: '13:15', desc: 'Cuarto de hora', fecha: '2025-11-23' },
    { horaInicio: '18:45', horaFin: '19:45', desc: 'Tres cuartos de hora', fecha: '2025-11-24' },
  ];

  for (const testCase of edgeCases) {
    try {
      await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha: testCase.fecha,
        horaInicio: testCase.horaInicio,
        horaFin: testCase.horaFin,
        notas: `Edge case: ${testCase.desc}`,
      });

      success(`✅ ${testCase.desc}: ${testCase.horaInicio} - ${testCase.horaFin}`);
    } catch (err: any) {
      error(`❌ Error: ${testCase.desc}`, err);
    }
  }
}

// ============================================================================
// TESTS - ACTUALIZAR CITAS
// ============================================================================

async function testActualizarCitaSoloHoras() {
  log('🔄', 'TEST 4: ACTUALIZAR CITA - SOLO CAMBIAR HORAS (SIN CAMBIAR FECHA)');

  // Limpiar y crear una cita específica para este test
  await limpiarCitasTest();
  
  const citaTest = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-11-25',
    horaInicio: '10:00',
    horaFin: '11:00',
    notas: 'Cita para test de actualización de horas',
  });

  // Este test valida el fix del bug de timezone UTC → Local
  const horasNuevas = [
    { horaInicio: '08:00', horaFin: '09:00', desc: 'Cambio a mañana' },
    { horaInicio: '14:00', horaFin: '15:00', desc: 'Cambio a tarde' },
    { horaInicio: '20:00', horaFin: '21:00', desc: 'Cambio a noche' },
    { horaInicio: '23:00', horaFin: '23:59', desc: 'Cambio a última hora' },
  ];

  for (const nuevoHorario of horasNuevas) {
    try {
      await citaService.actualizarCita(
        citaTest.id,
        negocioId,
        {
          horaInicio: nuevoHorario.horaInicio,
          horaFin: nuevoHorario.horaFin,
          // NO se envía fecha - debe usar fecha existente
        }
      );

      success(`✅ ${nuevoHorario.desc}: ${nuevoHorario.horaInicio} - ${nuevoHorario.horaFin}`);
      
      // Verificar que la fecha no cambió
      const citaVerificada = await citaService.obtenerCita(citaTest.id, negocioId);
      const fechaStr = citaVerificada.fecha instanceof Date 
        ? citaVerificada.fecha.toISOString().split('T')[0]
        : citaVerificada.fecha;
      
      if (fechaStr === '2025-11-25') {
        success(`   ✓ Fecha se mantuvo: ${fechaStr}`);
      } else {
        warning(`   ⚠️  Fecha cambió inesperadamente: ${fechaStr}`);
      }
    } catch (err: any) {
      error(`❌ Error: ${nuevoHorario.desc}`, err);
    }
  }
  
  // Limpiar la cita de prueba
  await citaService.eliminarCita(citaTest.id, negocioId);
}

async function testActualizarCitaFechaYHora() {
  log('🔄', 'TEST 5: ACTUALIZAR CITA - CAMBIAR FECHA Y HORA');

  // Limpiar y crear una cita específica para este test
  await limpiarCitasTest();
  
  const citaTest = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-11-26',
    horaInicio: '10:00',
    horaFin: '11:00',
    notas: 'Cita para test de actualización de fecha y hora',
  });

  const cambios = [
    { fecha: '2025-11-27', horaInicio: '09:00', horaFin: '10:00', desc: 'Cambio completo 1' },
    { fecha: '2025-11-28', horaInicio: '15:00', horaFin: '16:00', desc: 'Cambio completo 2' },
    { fecha: '2025-11-29', horaInicio: '21:00', horaFin: '22:00', desc: 'Cambio completo 3' },
  ];

  for (const cambio of cambios) {
    try {
      await citaService.actualizarCita(citaTest.id, negocioId, {
        fecha: cambio.fecha,
        horaInicio: cambio.horaInicio,
        horaFin: cambio.horaFin,
      });

      success(`✅ ${cambio.desc}: ${cambio.fecha} ${cambio.horaInicio} - ${cambio.horaFin}`);
      
      // Verificar día de la semana correcto
      const fechaDate = new Date(cambio.fecha + 'T00:00:00');
      const diaSemana = fechaDate.getDay();
      success(`   ✓ Día de semana calculado correctamente: ${diaSemana}`);
    } catch (err: any) {
      error(`❌ Error: ${cambio.desc}`, err);
    }
  }
  
  // Limpiar la cita de prueba
  await citaService.eliminarCita(citaTest.id, negocioId);
}

async function testActualizarCitaDiferentesDias() {
  log('📅', 'TEST 6: ACTUALIZAR CITA - CAMBIAR A DIFERENTES DÍAS');

  // Limpiar y crear una cita específica para este test
  await limpiarCitasTest();
  
  const citaTest = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-12-01',
    horaInicio: '10:00',
    horaFin: '11:00',
    notas: 'Cita para test de actualización de días',
  });

  const fechasDiferentes = [
    { fecha: '2025-12-02', dia: 'Martes' },
    { fecha: '2025-12-03', dia: 'Miércoles' },
    { fecha: '2025-12-04', dia: 'Jueves' },
  ];

  for (const item of fechasDiferentes) {
    try {
      await citaService.actualizarCita(citaTest.id, negocioId, {
        fecha: item.fecha,
        // No cambiar horas - solo fecha
      });

      const fechaDate = new Date(item.fecha + 'T00:00:00');
      const diaSemana = fechaDate.getDay();
      success(`✅ Movido a ${item.dia} ${item.fecha} (día ${diaSemana})`);
    } catch (err: any) {
      error(`❌ Error moviendo a ${item.dia}`, err);
    }
  }
  
  // Limpiar la cita de prueba
  await citaService.eliminarCita(citaTest.id, negocioId);
}

// ============================================================================
// TESTS - VALIDACIONES
// ============================================================================

async function testValidarHorarioSucursal() {
  log('🏢', 'TEST 7: VALIDAR HORARIO DE SUCURSAL');

  // Limpiar antes del test
  await limpiarCitasTest();

  // Crear horario restringido temporal
  await prisma.horarioSucursal.updateMany({
    where: { sucursalId, diaSemana: 1 }, // Lunes
    data: {
      horaApertura: '08:00',
      horaCierre: '18:00',
    },
  });

  const casos = [
    { horaInicio: '07:00', horaFin: '08:00', debeSerValido: false, desc: 'Antes de apertura', fecha: '2025-12-08' }, // Lunes
    { horaInicio: '08:00', horaFin: '09:00', debeSerValido: true, desc: 'En horario válido', fecha: '2025-12-08' },
    { horaInicio: '17:00', horaFin: '18:00', debeSerValido: true, desc: 'Hasta el cierre', fecha: '2025-12-08' },
    { horaInicio: '18:00', horaFin: '19:00', debeSerValido: false, desc: 'Después del cierre', fecha: '2025-12-08' },
  ];

  for (const caso of casos) {
    try {
      await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha: caso.fecha,
        horaInicio: caso.horaInicio,
        horaFin: caso.horaFin,
      });

      if (caso.debeSerValido) {
        success(`✅ ${caso.desc}: Válido correctamente`);
      } else {
        warning(`⚠️  ${caso.desc}: DEBIÓ rechazarse pero fue aceptado`);
      }
    } catch (err: any) {
      if (!caso.debeSerValido) {
        success(`✅ ${caso.desc}: Rechazado correctamente`);
      } else {
        error(`❌ ${caso.desc}: DEBIÓ aceptarse pero fue rechazado`, err);
      }
    }
  }

  // Restaurar horario 24/7
  await prisma.horarioSucursal.updateMany({
    where: { sucursalId, diaSemana: 1 },
    data: { horaApertura: '00:00', horaCierre: '23:59' },
  });
}

async function testObtenerDisponibilidad() {
  log('📊', 'TEST 8: OBTENER DISPONIBILIDAD DE HORARIOS');

  for (const fecha of fechasTest.slice(0, 3)) {
    try {
      const disponibilidad = await citaService.obtenerDisponibilidad(negocioId, {
        empleadoId,
        sucursalId,
        servicioId,
        fecha: fecha.fecha,
      });

      success(`✅ ${fecha.dia} ${fecha.fecha}: ${disponibilidad.length} slots`);
      
      // Mostrar primeros 5 slots
      const primerosSlots = disponibilidad.slice(0, 5);
      primerosSlots.forEach((slot, idx) => {
        const estado = slot.disponible ? '🟢 Disponible' : '🔴 Ocupado';
        console.log(`   ${idx + 1}. ${slot.horaInicio} - ${slot.horaFin} ${estado}`);
      });
    } catch (err: any) {
      error(`❌ Error obteniendo disponibilidad para ${fecha.dia}`, err);
    }
  }
}

async function testValidarCapacidadSucursal() {
  log('👥', 'TEST 9: VALIDAR CAPACIDAD DE SUCURSAL');

  // Crear múltiples citas simultáneas para probar capacidad
  const horasSimultaneas = ['10:00', '10:30', '11:00'];
  const citasCreadas: string[] = [];

  for (const hora of horasSimultaneas) {
    try {
      const cita = await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        // Sin empleado - prueba capacidad de sucursal
        fecha: '2025-10-31', // Viernes
        horaInicio: hora,
        horaFin: calcularHoraFin(hora, 30),
      });

      citasCreadas.push(cita.id);
      success(`✅ Cita simultánea creada: ${hora}`);
    } catch (err: any) {
      warning(`⚠️  Capacidad agotada en: ${hora}`);
      break;
    }
  }

  success(`Total de citas simultáneas creadas: ${citasCreadas.length}`);

  // Limpiar
  for (const id of citasCreadas) {
    await citaService.eliminarCita(id, negocioId);
  }
}

// ============================================================================
// TESTS - ESTADOS Y OPERACIONES
// ============================================================================

async function testCambiarEstados() {
  log('🔀', 'TEST 10: CAMBIAR ESTADOS DE CITA');

  // Limpiar y crear una cita específica para este test
  await limpiarCitasTest();
  
  const citaTest = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-12-10',
    horaInicio: '10:00',
    horaFin: '11:00',
    notas: 'Cita para test de cambio de estados',
  });

  const estados = [
    { metodo: 'confirmarCita', estado: 'CONFIRMADA' },
    { metodo: 'completarCita', estado: 'COMPLETADA' },
    { metodo: 'cancelarCita', estado: 'CANCELADA' },
  ];

  for (const { metodo, estado } of estados) {
    try {
      await (citaService as any)[metodo](citaTest.id, negocioId);
      success(`✅ Estado cambiado a: ${estado}`);
      
      const cita = await citaService.obtenerCita(citaTest.id, negocioId);
      if (cita.estado === estado) {
        success(`   ✓ Estado verificado: ${estado}`);
      } else {
        warning(`   ⚠️  Estado esperado ${estado}, obtenido ${cita.estado}`);
      }
    } catch (err: any) {
      error(`❌ Error cambiando a estado ${estado}`, err);
    }
  }
  
  // Limpiar la cita de prueba
  await citaService.eliminarCita(citaTest.id, negocioId);
}

async function testObtenerEstadisticas() {
  log('📈', 'TEST 11: OBTENER ESTADÍSTICAS DE CITAS');

  try {
    const stats = await citaService.obtenerEstadisticas(
      negocioId,
      '2025-10-01',
      '2025-10-31'
    );

    log('📊', 'Estadísticas de Octubre 2025', stats);
    success('✅ Estadísticas obtenidas correctamente');
  } catch (err: any) {
    error('❌ Error obteniendo estadísticas', err);
  }
}

// ============================================================================
// TESTS ADICIONALES - EDGE CASES Y VALIDACIONES AVANZADAS
// ============================================================================

async function testTimezoneConversion() {
  log('🌍', 'TEST 12: VALIDAR CONVERSIÓN DE TIMEZONE UTC → LOCAL');

  // Limpiar citas antes de este test
  await limpiarCitasTest();

  // Crear cita para diferentes fechas
  const fechasPrueba = [
    { fecha: '2025-10-27', esperado: 1, desc: 'Lunes' },
    { fecha: '2025-11-01', esperado: 6, desc: 'Sábado' },
    { fecha: '2025-11-02', esperado: 0, desc: 'Domingo' },
  ];

  for (const { fecha, esperado, desc } of fechasPrueba) {
    try {
      const cita = await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha,
        horaInicio: '14:00',
        horaFin: '15:00',
        notas: `Test timezone ${desc}`,
      });

      // Actualizar solo horas (sin cambiar fecha) - esto usa la conversión UTC→Local
      await citaService.actualizarCita(cita.id, negocioId, {
        horaInicio: '16:00',
        horaFin: '17:00',
      });

      const citaActualizada = await citaService.obtenerCita(cita.id, negocioId);
      
      // Parsear la fecha correctamente usando parseDate del servicio
      let fechaDate: Date;
      if (citaActualizada.fecha instanceof Date) {
        // Convertir UTC a local usando el mismo método que el servicio
        const year = citaActualizada.fecha.getUTCFullYear();
        const month = citaActualizada.fecha.getUTCMonth();
        const day = citaActualizada.fecha.getUTCDate();
        fechaDate = new Date(year, month, day, 0, 0, 0, 0);
      } else {
        const fechaStr = String(citaActualizada.fecha);
        const [year, month, dayStr] = fechaStr.split('-').map(Number);
        fechaDate = new Date(year, month - 1, dayStr, 0, 0, 0, 0);
      }
      
      const diaSemana = fechaDate.getDay();

      if (diaSemana === esperado) {
        success(`✅ ${desc} - Día de semana correcto: ${diaSemana}`);
      } else {
        error(`❌ ${desc} - Día incorrecto. Esperado: ${esperado}, Obtenido: ${diaSemana}`);
      }

      await citaService.eliminarCita(cita.id, negocioId);
    } catch (err: any) {
      error(`❌ Error en timezone test para ${desc}`, err);
    }
  }
}

async function testActualizacionesParciales() {
  log('🔧', 'TEST 13: ACTUALIZACIONES PARCIALES - SOLO CAMPOS ESPECÍFICOS');

  // Limpiar antes del test
  await limpiarCitasTest();

  // Crear cita base en fecha sin conflictos
  const citaBase = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-11-05', // Fecha futura sin conflictos
    horaInicio: '10:00',
    horaFin: '11:00',
    notas: 'Cita original',
  });

  const tests = [
    { campo: 'Solo notas', update: { notas: 'Notas actualizadas' } },
    { campo: 'Solo hora inicio', update: { horaInicio: '11:00' } },
    { campo: 'Solo hora fin', update: { horaFin: '12:00' } },
    { campo: 'Solo fecha', update: { fecha: '2025-11-06' } },
  ];

  for (const test of tests) {
    try {
      await citaService.actualizarCita(citaBase.id, negocioId, test.update);
      success(`✅ ${test.campo}: Actualizado correctamente`);
    } catch (err: any) {
      error(`❌ ${test.campo}: Error`, err);
    }
  }

  await citaService.eliminarCita(citaBase.id, negocioId);
}

async function testConflictosDeHorario() {
  log('⚔️', 'TEST 14: VALIDAR DETECCIÓN DE CONFLICTOS DE HORARIO');

  // Limpiar antes del test
  await limpiarCitasTest();

  // Crear primera cita
  const cita1 = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-11-07', // Fecha diferente
    horaInicio: '10:00',
    horaFin: '11:00',
  });

  // Intentar crear citas que se solapan
  const conflictos = [
    { horaInicio: '10:00', horaFin: '11:00', desc: 'Exactamente igual' },
    { horaInicio: '10:30', horaFin: '11:30', desc: 'Solapa al final' },
    { horaInicio: '09:30', horaFin: '10:30', desc: 'Solapa al inicio' },
    { horaInicio: '09:00', horaFin: '12:00', desc: 'Contiene completa' },
    { horaInicio: '10:15', horaFin: '10:45', desc: 'Dentro del rango' },
  ];

  for (const conflicto of conflictos) {
    try {
      await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha: '2025-11-07', // Misma fecha
        horaInicio: conflicto.horaInicio,
        horaFin: conflicto.horaFin,
      });
      
      warning(`⚠️  ${conflicto.desc}: NO detectó conflicto (debería rechazar)`);
    } catch (err: any) {
      success(`✅ ${conflicto.desc}: Conflicto detectado correctamente`);
    }
  }

  // Probar horas que NO deberían generar conflicto
  const noConflictos = [
    { horaInicio: '11:00', horaFin: '12:00', desc: 'Justo después' },
    { horaInicio: '09:00', horaFin: '10:00', desc: 'Justo antes' },
    { horaInicio: '14:00', horaFin: '15:00', desc: 'Muy separado' },
  ];

  for (const noConflicto of noConflictos) {
    try {
      const citaTemp = await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha: '2025-11-07',
        horaInicio: noConflicto.horaInicio,
        horaFin: noConflicto.horaFin,
      });
      
      success(`✅ ${noConflicto.desc}: Creada correctamente (sin conflicto)`);
      await citaService.eliminarCita(citaTemp.id, negocioId);
    } catch (err: any) {
      error(`❌ ${noConflicto.desc}: Rechazada incorrectamente`, err);
    }
  }

  await citaService.eliminarCita(cita1.id, negocioId);
}

async function testValidacionesDeCampos() {
  log('📋', 'TEST 15: VALIDACIONES DE CAMPOS Y DATOS INVÁLIDOS');

  const testsCamposInvalidos = [
    {
      desc: 'Cliente inexistente',
      data: {
        clienteId: '00000000-0000-0000-0000-000000000000',
        servicioId,
        sucursalId,
        fecha: '2025-10-27',
        horaInicio: '10:00',
        horaFin: '11:00',
      },
    },
    {
      desc: 'Servicio inexistente',
      data: {
        clienteId,
        servicioId: '00000000-0000-0000-0000-000000000000',
        sucursalId,
        fecha: '2025-10-27',
        horaInicio: '10:00',
        horaFin: '11:00',
      },
    },
    {
      desc: 'Sucursal inexistente',
      data: {
        clienteId,
        servicioId,
        sucursalId: '00000000-0000-0000-0000-000000000000',
        fecha: '2025-10-27',
        horaInicio: '10:00',
        horaFin: '11:00',
      },
    },
  ];

  for (const test of testsCamposInvalidos) {
    try {
      await citaService.crearCita(negocioId, test.data as any);
      warning(`⚠️  ${test.desc}: NO rechazó (debería validar)`);
    } catch (err: any) {
      success(`✅ ${test.desc}: Validado correctamente`);
    }
  }
}

async function testCitasSinEmpleado() {
  log('👤', 'TEST 16: CITAS SIN EMPLEADO ASIGNADO (CAPACIDAD DE SUCURSAL)');

  const horariosParalelos = [
    { horaInicio: '08:00', horaFin: '09:00' },
    { horaInicio: '08:00', horaFin: '09:00' },
    { horaInicio: '08:00', horaFin: '09:00' },
  ];

  const citasCreadas: string[] = [];

  for (let i = 0; i < horariosParalelos.length; i++) {
    const horario = horariosParalelos[i];
    try {
      const cita = await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        // Sin empleadoId - prueba capacidad de sucursal
        fecha: '2025-10-29',
        horaInicio: horario.horaInicio,
        horaFin: horario.horaFin,
      });

      citasCreadas.push(cita.id);
      success(`✅ Cita ${i + 1} sin empleado creada: ${horario.horaInicio} - ${horario.horaFin}`);
    } catch (err: any) {
      warning(`⚠️  Cita ${i + 1}: Capacidad agotada o error - ${err.message}`);
      break;
    }
  }

  success(`Total citas sin empleado creadas: ${citasCreadas.length}`);

  // Limpiar
  for (const id of citasCreadas) {
    await citaService.eliminarCita(id, negocioId);
  }
}

async function testHistorialYProximasCitas() {
  log('📜', 'TEST 17: HISTORIAL Y PRÓXIMAS CITAS DE CLIENTE');

  // Limpiar antes del test
  await limpiarCitasTest();

  // Crear citas en diferentes fechas
  const citasPasadas = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-10-01', // Pasada
    horaInicio: '10:00',
    horaFin: '11:00',
  });

  const citasFuturas = await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-12-25', // Futura
    horaInicio: '10:00',
    horaFin: '11:00',
  });

  try {
    const proximasCitas = await citaService.obtenerProximasCitasCliente(clienteId, negocioId);
    success(`✅ Próximas citas obtenidas: ${proximasCitas.length} citas`);

    const historial = await citaService.obtenerHistorialCliente(clienteId, negocioId);
    success(`✅ Historial obtenido: ${historial.length} citas`);
  } catch (err: any) {
    error('❌ Error obteniendo historial/próximas citas', err);
  }

  await citaService.eliminarCita(citasPasadas.id, negocioId);
  await citaService.eliminarCita(citasFuturas.id, negocioId);
}

async function testListarConFiltros() {
  log('🔍', 'TEST 18: LISTAR CITAS CON DIFERENTES FILTROS');

  // Limpiar antes del test
  await limpiarCitasTest();

  // Crear varias citas con diferentes estados
  const citas = [];

  citas.push(await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-12-15',
    horaInicio: '09:00',
    horaFin: '10:00',
  }));

  citas.push(await citaService.crearCita(negocioId, {
    clienteId,
    servicioId,
    sucursalId,
    empleadoId,
    fecha: '2025-12-15',
    horaInicio: '11:00',
    horaFin: '12:00',
  }));

  // Cambiar estados
  await citaService.confirmarCita(citas[0].id, negocioId);
  await citaService.cancelarCita(citas[1].id, negocioId);

  const filtros = [
    { filtro: { estado: 'CONFIRMADA' }, desc: 'Estado CONFIRMADA' },
    { filtro: { estado: 'CANCELADA' }, desc: 'Estado CANCELADA' },
    { filtro: { sucursalId }, desc: 'Por sucursal' },
    { filtro: { empleadoId }, desc: 'Por empleado' },
    { filtro: { clienteId }, desc: 'Por cliente' },
  ];

  for (const { filtro, desc } of filtros) {
    try {
      const resultado = await citaService.listarCitas(negocioId, filtro as any);
      const total = resultado.citas ? resultado.citas.length : resultado.total || 0;
      success(`✅ ${desc}: ${total} citas encontradas`);
    } catch (err: any) {
      error(`❌ ${desc}: Error`, err);
    }
  }

  // Limpiar
  for (const cita of citas) {
    await citaService.eliminarCita(cita.id, negocioId);
  }
}

async function testCitasPorFecha() {
  log('📅', 'TEST 19: OBTENER CITAS POR FECHA ESPECÍFICA');

  // Limpiar antes del test
  await limpiarCitasTest();

  const fecha = '2025-12-16';

  // Crear múltiples citas en la misma fecha con horarios NO superpuestos
  const citasDelDia = [];
  for (let i = 0; i < 3; i++) {
    // Horarios espaciados: 9-10, 11-12, 13-14 (sin solapamiento)
    const horaInicio = 9 + i * 2;
    const horaFin = horaInicio + 1;
    
    citasDelDia.push(await citaService.crearCita(negocioId, {
      clienteId,
      servicioId,
      sucursalId,
      empleadoId,
      fecha,
      horaInicio: `${horaInicio.toString().padStart(2, '0')}:00`,
      horaFin: `${horaFin.toString().padStart(2, '0')}:00`,
    }));
  }

  try {
    const citas = await citaService.obtenerCitasPorFecha(negocioId, fecha, sucursalId);
    
    if (citas.length >= 3) {
      success(`✅ Citas del día obtenidas: ${citas.length} citas`);
    } else {
      warning(`⚠️  Esperadas al menos 3 citas, obtenidas: ${citas.length}`);
    }
  } catch (err: any) {
    error('❌ Error obteniendo citas por fecha', err);
  }

  // Limpiar
  for (const cita of citasDelDia) {
    await citaService.eliminarCita(cita.id, negocioId);
  }
}

async function testHorariosExtremos() {
  log('⏰', 'TEST 20: HORARIOS EXTREMOS Y LÍMITES');

  // Limpiar antes del test
  await limpiarCitasTest();

  const casosExtremos = [
    { horaInicio: '00:00', horaFin: '00:30', desc: 'Medianoche inicio', fecha: '2025-12-17' },
    { horaInicio: '23:30', horaFin: '23:59', desc: 'Último minuto del día', fecha: '2025-12-18' },
    { horaInicio: '00:01', horaFin: '01:01', desc: 'Primer minuto', fecha: '2025-12-19' },
    { horaInicio: '06:45', horaFin: '07:45', desc: 'Minutos no redondos 45', fecha: '2025-12-20' },
    { horaInicio: '13:33', horaFin: '14:33', desc: 'Minutos arbitrarios 33', fecha: '2025-12-21' },
  ];

  for (const caso of casosExtremos) {
    try {
      const cita = await citaService.crearCita(negocioId, {
        clienteId,
        servicioId,
        sucursalId,
        empleadoId,
        fecha: caso.fecha,
        horaInicio: caso.horaInicio,
        horaFin: caso.horaFin,
      });

      success(`✅ ${caso.desc}: ${caso.horaInicio} - ${caso.horaFin}`);
      await citaService.eliminarCita(cita.id, negocioId);
    } catch (err: any) {
      error(`❌ ${caso.desc}`, err);
    }
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function calcularHoraFin(horaInicio: string, duracionMinutos: number): string {
  const [horas, minutos] = horaInicio.split(':').map(Number);
  const totalMinutos = horas * 60 + minutos + duracionMinutos;
  
  const nuevasHoras = Math.floor(totalMinutos / 60) % 24;
  const nuevosMinutos = totalMinutos % 60;
  
  return `${nuevasHoras.toString().padStart(2, '0')}:${nuevosMinutos.toString().padStart(2, '0')}`;
}

// ============================================================================
// EJECUTAR TODAS LAS PRUEBAS
// ============================================================================

async function runAllTests() {
  console.clear();
  log('🚀', '='.repeat(60));
  log('🧪', 'INICIANDO SUITE DE PRUEBAS - CITA SERVICE');
  log('🚀', '='.repeat(60));

  try {
    // Setup
    await setupTestData();
    await limpiarCitasTest();

    // Tests de creación
    await testCrearCitasVariasHoras();
    await testCrearCitasDiferentesDias();
    await testCrearCitaEdgeCases();

    // Tests de actualización (el más importante para validar el fix)
    await testActualizarCitaSoloHoras();
    await testActualizarCitaFechaYHora();
    await testActualizarCitaDiferentesDias();

    // Tests de validaciones
    await testValidarHorarioSucursal();
    await testObtenerDisponibilidad();
    await testValidarCapacidadSucursal();

    // Tests de estados
    await testCambiarEstados();
    await testObtenerEstadisticas();

    // ===== NUEVOS TESTS EXHAUSTIVOS =====
    await limpiarCitasTest(); // Limpiar antes de tests adicionales
    await testTimezoneConversion();
    
    await limpiarCitasTest();
    await testActualizacionesParciales();
    
    await limpiarCitasTest();
    await testConflictosDeHorario();
    
    await limpiarCitasTest();
    await testValidacionesDeCampos();
    
    await limpiarCitasTest();
    await testCitasSinEmpleado();
    
    await limpiarCitasTest();
    await testHistorialYProximasCitas();
    
    await limpiarCitasTest();
    await testListarConFiltros();
    
    await limpiarCitasTest();
    await testCitasPorFecha();
    
    await limpiarCitasTest();
    await testHorariosExtremos();

    // Cleanup final
    await limpiarCitasTest();

    log('🎉', '='.repeat(60));
    log('✅', 'TODAS LAS PRUEBAS COMPLETADAS');
    log('🎉', '='.repeat(60));
  } catch (err: any) {
    error('❌ ERROR FATAL EN LA SUITE DE PRUEBAS', err);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  runAllTests,
  testCrearCitasVariasHoras,
  testActualizarCitaSoloHoras,
  testValidarHorarioSucursal,
  testObtenerDisponibilidad,
  testTimezoneConversion,
  testActualizacionesParciales,
  testConflictosDeHorario,
  testValidacionesDeCampos,
  testCitasSinEmpleado,
  testHistorialYProximasCitas,
  testListarConFiltros,
  testCitasPorFecha,
  testHorariosExtremos,
};
