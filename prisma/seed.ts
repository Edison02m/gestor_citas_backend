import dotenv from 'dotenv';
import { SuperAdminService } from '../src/services/superadmin.service';

// Cargar variables de entorno
dotenv.config();

async function seed() {
  console.log('🌱 Iniciando seed de Super Admin...\n');

  const service = new SuperAdminService();

  try {


    // Crear el primer super admin
    console.log('📝 Creando el primer Super Admin...');
    
    const superAdmin = await service.create({
      email: 'admin@gestor-citas.com',
      password: 'Admin123',
      nombre: 'Super Administrador'
    });

    console.log('\n✅ Super Admin creado exitosamente!');
    console.log('📧 Email:', superAdmin.email);
    console.log('🔑 Password: Admin123');
    console.log('👤 Nombre:', superAdmin.nombre);
    console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer login!\n');

  } catch (error: any) {
    console.error('\n❌ Error al crear Super Admin:');
    console.error(error.message);
    process.exit(1);
  }
}

seed()
  .then(() => {
    console.log('🎉 Seed completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error en seed:', error);
    process.exit(1);
  });
