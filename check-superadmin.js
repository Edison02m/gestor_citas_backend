// Verificar SuperAdmin en CockroachDB
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkSuperAdmin() {
  try {
    console.log("🔍 Buscando SuperAdmin en CockroachDB...\n");
    
    const superAdmins = await prisma.superAdmin.findMany();
    
    if (superAdmins.length === 0) {
      console.log("⚠️  No se encontró ningún SuperAdmin");
      console.log("💡 Ejecuta: npx prisma db seed");
    } else {
      console.log("✅ SuperAdmins encontrados:", superAdmins.length);
      console.log("─".repeat(50));
      superAdmins.forEach((admin, i) => {
        console.log(`\n${i + 1}. SuperAdmin:`);
        console.log(`   📧 Email: ${admin.email}`);
        console.log(`   👤 Nombre: ${admin.nombre || 'N/A'}`);
        console.log(`   🆔 ID: ${admin.id}`);
        console.log(`   📅 Creado: ${admin.createdAt}`);
      });
      console.log("\n" + "─".repeat(50));
      console.log("\n🔑 Credenciales de acceso:");
      console.log(`   Email: ${superAdmins[0].email}`);
      console.log(`   Password: Admin123 (si no la cambiaste)`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperAdmin();
