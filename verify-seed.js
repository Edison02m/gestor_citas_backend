// Verificar datos seeded en CockroachDB
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function verifySeed() {
  try {
    console.log("🔍 Verificando datos en CockroachDB...\n");
    
    // Contar registros en tablas principales
    const superAdmins = await prisma.superAdmin.count();
    const planes = await prisma.configuracionPlanes.count();
    const negocios = await prisma.negocio.count();
    const usuarios = await prisma.usuario.count();
    const sucursales = await prisma.sucursal.count();
    const servicios = await prisma.servicio.count();
    const clientes = await prisma.cliente.count();
    const citas = await prisma.cita.count();
    
    console.log("📊 RESUMEN DE DATOS:");
    console.log("─".repeat(40));
    console.log(`👤 SuperAdmins:    ${superAdmins}`);
    console.log(`💎 Planes:         ${planes}`);
    console.log(`🏢 Negocios:       ${negocios}`);
    console.log(`👥 Usuarios:       ${usuarios}`);
    console.log(`📍 Sucursales:     ${sucursales}`);
    console.log(`✂️  Servicios:      ${servicios}`);
    console.log(`👨 Clientes:       ${clientes}`);
    console.log(`📅 Citas:          ${citas}`);
    console.log("─".repeat(40));
    
    if (planes > 0) {
      console.log("\n💎 PLANES CONFIGURADOS:");
      const planesData = await prisma.configuracionPlanes.findMany({
        orderBy: { orden: 'asc' }
      });
      planesData.forEach(plan => {
        console.log(`   • ${plan.nombre}: $${plan.precioMensual}/mes`);
        console.log(`     - Sucursales: ${plan.maxSucursales}`);
        console.log(`     - Empleados: ${plan.maxEmpleados}`);
        console.log(`     - Citas/mes: ${plan.maxCitasMes}`);
      });
    }
    
    console.log("\n✅ Base de datos lista para usar!");
    console.log("\n🚀 Puedes iniciar el servidor con: npm run dev");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifySeed();
