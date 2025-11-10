import { PrismaClient, PlanSuscripcion } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para poblar la tabla ConfiguracionPlanes con los valores por defecto
 * Ejecutar con: npx tsx prisma/seed-planes.ts
 */
async function seedPlanes() {
  console.log('🌱 Iniciando seed de configuración de planes...\n');

  const planesConfig = [
    {
      plan: 'GRATIS' as PlanSuscripcion,
      nombre: 'Gratis',
      descripcion: 'Prueba gratuita de 14 días',
      limiteSucursales: 1,
      limiteEmpleados: 3,
      limiteServicios: 5,
      limiteClientes: 50,
      limiteCitasMes: 50,
      limiteWhatsAppMes: null, // Sin WhatsApp
      limiteEmailMes: 50,
      reportesAvanzados: false,
      duracionDias: 14,
      precio: 0,
    },
    {
      plan: 'PRO_MENSUAL' as PlanSuscripcion,
      nombre: 'PRO Mensual',
      descripcion: 'Plan PRO facturado mensualmente',
      limiteSucursales: 5,
      limiteEmpleados: 10,
      limiteServicios: 25,
      limiteClientes: 500,
      limiteCitasMes: null, // Ilimitado
      limiteWhatsAppMes: 300,
      limiteEmailMes: 300,
      reportesAvanzados: true, // ✅ PRO tiene reportes avanzados
      duracionDias: 30,
      precio: 10,
    },
    {
      plan: 'PRO_ANUAL' as PlanSuscripcion,
      nombre: 'PRO Anual',
      descripcion: 'Plan PRO facturado anualmente (10% descuento)',
      limiteSucursales: 5,
      limiteEmpleados: 10,
      limiteServicios: 25,
      limiteClientes: 500,
      limiteCitasMes: null, // Ilimitado
      limiteWhatsAppMes: 300,
      limiteEmailMes: 300,
      reportesAvanzados: true, // ✅ PRO tiene reportes avanzados
      duracionDias: 365,
      precio: 9, // $9/mes pagado anualmente
    },
    {
      plan: 'PRO_PLUS_MENSUAL' as PlanSuscripcion,
      nombre: 'PRO PLUS Mensual',
      descripcion: 'Plan PRO PLUS facturado mensualmente - Todo ilimitado',
      limiteSucursales: null, // Ilimitado
      limiteEmpleados: null,
      limiteServicios: null,
      limiteClientes: null,
      limiteCitasMes: null,
      limiteWhatsAppMes: null,
      limiteEmailMes: null,
      reportesAvanzados: true,
      duracionDias: 30,
      precio: 20,
    },
    {
      plan: 'PRO_PLUS_ANUAL' as PlanSuscripcion,
      nombre: 'PRO PLUS Anual',
      descripcion: 'Plan PRO PLUS facturado anualmente - Todo ilimitado (15% descuento)',
      limiteSucursales: null, // Ilimitado
      limiteEmpleados: null,
      limiteServicios: null,
      limiteClientes: null,
      limiteCitasMes: null,
      limiteWhatsAppMes: null,
      limiteEmailMes: null,
      reportesAvanzados: true,
      duracionDias: 365,
      precio: 17, // $17/mes pagado anualmente
    },
  ];

  try {
    console.log('📝 Creando configuración de planes...\n');

    for (const planConfig of planesConfig) {
      // Usar upsert para evitar duplicados
      const plan = await prisma.configuracionPlanes.upsert({
        where: { plan: planConfig.plan },
        update: planConfig,
        create: planConfig,
      });

      console.log(`✅ ${plan.nombre} configurado`);
      console.log(`   Precio: $${plan.precio}/mes`);
      console.log(`   Sucursales: ${plan.limiteSucursales ?? '∞'}`);
      console.log(`   Empleados: ${plan.limiteEmpleados ?? '∞'}`);
      console.log(`   Servicios: ${plan.limiteServicios ?? '∞'}`);
      console.log(`   Clientes: ${plan.limiteClientes ?? '∞'}`);
      console.log(`   Citas/mes: ${plan.limiteCitasMes ?? '∞'}`);
      const whatsapp = plan.limiteWhatsAppMes ?? (plan.precio.toNumber() === 0 ? 'No disponible' : '∞');
      console.log(`   WhatsApp/mes: ${whatsapp}`);
      console.log('');
    }

    console.log('✅ Configuración de planes completada!\n');
  } catch (error: any) {
    console.error('❌ Error al crear configuración de planes:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedPlanes()
  .then(() => {
    console.log('🎉 Seed de planes completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error en seed:', error);
    process.exit(1);
  });
