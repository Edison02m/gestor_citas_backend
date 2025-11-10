// Test de conexión a CockroachDB
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log("🔌 Conectando a CockroachDB...");
    
    // Intentar hacer una consulta simple
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log("✅ Conexión exitosa a CockroachDB!");
    console.log("📊 Versión:", result[0].version);
    
    // Contar tablas creadas
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log("\n📋 Tablas creadas:", tables.length);
    tables.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.table_name}`);
    });
    
    console.log("\n🎉 ¡Migración a CockroachDB completada exitosamente!");
    
  } catch (error) {
    console.error("❌ Error al conectar:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
