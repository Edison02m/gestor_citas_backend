import { SuperAdminRepository } from '../repositories/superadmin.repository';
import { PasswordUtil } from '../utils/password.util';
import {
  CreateSuperAdminDto,
  SuperAdminResponse
} from '../models/superadmin.model';

export class SuperAdminService {
  private repository: SuperAdminRepository;

  constructor() {
    this.repository = new SuperAdminRepository();
  }

  private toResponse(superAdmin: any): SuperAdminResponse {
    return {
      id: superAdmin.id,
      email: superAdmin.email,
      nombre: superAdmin.nombre,
      rol: superAdmin.rol,
      activo: superAdmin.activo,
      createdAt: superAdmin.createdAt,
      updatedAt: superAdmin.updatedAt
    };
  }

  async create(createDto: CreateSuperAdminDto): Promise<SuperAdminResponse> {
    const { email, password, nombre } = createDto;

    if (!email || !password || !nombre) {
      throw new Error('Email, password y nombre son requeridos');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Formato de email inválido');
    }

    const passwordValidation = PasswordUtil.validate(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Password inválido');
    }

    const emailExists = await this.repository.emailExists(email.toLowerCase().trim());
    if (emailExists) {
      throw new Error('El email ya está registrado');
    }

    const hashedPassword = await PasswordUtil.hash(password);

    const superAdmin = await this.repository.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      nombre: nombre.trim(),
      rol: 'SUPER_ADMIN',
      activo: true
    });

    return this.toResponse(superAdmin);
  }
}
