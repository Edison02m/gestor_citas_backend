import { SuperAdminRepository } from '../repositories/superadmin.repository';
import { PasswordUtil } from '../utils/password.util';
import { JwtUtil } from '../utils/jwt.util';
import {
  CreateSuperAdminDto,
  UpdateSuperAdminDto,
  SuperAdminResponse,
  LoginDto,
  LoginResponse,
  SuperAdminListResponse
} from '../models/superadmin.model';

export class SuperAdminService {
  private repository: SuperAdminRepository;

  constructor() {
    this.repository = new SuperAdminRepository();
  }

  /**
   * Transforma un SuperAdmin de Prisma a SuperAdminResponse (sin password)
   */
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

  /**
   * LOGIN - Autenticar super admin
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;

    // Validar que vengan los datos
    if (!email || !password) {
      throw new Error('Email y password son requeridos');
    }

    // Buscar super admin por email
    const superAdmin = await this.repository.findByEmail(email.toLowerCase().trim());
    
    if (!superAdmin) {
      throw new Error('Credenciales inválidas');
    }

    // Verificar que esté activo
    if (!superAdmin.activo) {
      throw new Error('Usuario inactivo. Contacte al administrador');
    }

    // Comparar password
    const passwordMatch = await PasswordUtil.compare(password, superAdmin.password);
    
    if (!passwordMatch) {
      throw new Error('Credenciales inválidas');
    }

    // Generar token JWT
    const token = JwtUtil.generate({
      userId: superAdmin.id,
      email: superAdmin.email,
      rol: superAdmin.rol
    });

    return {
      token,
      user: this.toResponse(superAdmin)
    };
  }

  /**
   * Obtener todos los super admins
   */
  async getAll(): Promise<SuperAdminResponse[]> {
    const superAdmins = await this.repository.findAll();
    return superAdmins.map((sa: any) => this.toResponse(sa));
  }

  /**
   * Obtener con paginación
   */
  async getPaginated(page: number = 1, limit: number = 10): Promise<SuperAdminListResponse> {
    const result = await this.repository.findPaginated(page, limit);
    
    return {
      data: result.data.map((sa: any) => this.toResponse(sa)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    };
  }

  /**
   * Obtener por ID
   */
  async getById(id: string): Promise<SuperAdminResponse> {
    if (!id) {
      throw new Error('ID es requerido');
    }

    const superAdmin = await this.repository.findById(id);
    
    if (!superAdmin) {
      throw new Error('Super Admin no encontrado');
    }

    return this.toResponse(superAdmin);
  }

  /**
   * Crear super admin
   */
  async create(createDto: CreateSuperAdminDto): Promise<SuperAdminResponse> {
    const { email, password, nombre } = createDto;

    // Validaciones
    if (!email || !password || !nombre) {
      throw new Error('Email, password y nombre son requeridos');
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Formato de email inválido');
    }

    // Validar password
    const passwordValidation = PasswordUtil.validate(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Password inválido');
    }

    // Verificar que el email no exista
    const emailExists = await this.repository.emailExists(email.toLowerCase().trim());
    if (emailExists) {
      throw new Error('El email ya está registrado');
    }

    // Hashear password
    const hashedPassword = await PasswordUtil.hash(password);

    // Crear super admin
    const superAdmin = await this.repository.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      nombre: nombre.trim(),
      rol: 'SUPER_ADMIN',
      activo: true
    });

    return this.toResponse(superAdmin);
  }

  /**
   * Actualizar super admin
   */
  async update(id: string, updateDto: UpdateSuperAdminDto): Promise<SuperAdminResponse> {
    if (!id) {
      throw new Error('ID es requerido');
    }

    // Verificar que exista
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Super Admin no encontrado');
    }

    const dataToUpdate: any = {};

    // Email
    if (updateDto.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateDto.email)) {
        throw new Error('Formato de email inválido');
      }

      const emailExists = await this.repository.emailExists(updateDto.email.toLowerCase().trim(), id);
      if (emailExists) {
        throw new Error('El email ya está registrado');
      }

      dataToUpdate.email = updateDto.email.toLowerCase().trim();
    }

    // Nombre
    if (updateDto.nombre) {
      dataToUpdate.nombre = updateDto.nombre.trim();
    }

    // Password
    if (updateDto.password) {
      const passwordValidation = PasswordUtil.validate(updateDto.password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message || 'Password inválido');
      }
      dataToUpdate.password = await PasswordUtil.hash(updateDto.password);
    }

    // Activo
    if (typeof updateDto.activo === 'boolean') {
      dataToUpdate.activo = updateDto.activo;
    }

    // Actualizar
    const updated = await this.repository.update(id, dataToUpdate);

    return this.toResponse(updated);
  }

  /**
   * Eliminar super admin
   */
  async delete(id: string): Promise<{ message: string }> {
    if (!id) {
      throw new Error('ID es requerido');
    }

    // Verificar que exista
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Super Admin no encontrado');
    }

    // Verificar que no sea el último super admin activo
    const activeSuperAdmins = await this.repository.findActive();
    if (activeSuperAdmins.length === 1 && activeSuperAdmins[0].id === id) {
      throw new Error('No se puede eliminar el último Super Admin activo');
    }

    await this.repository.delete(id);

    return { message: 'Super Admin eliminado exitosamente' };
  }

  /**
   * Activar/Desactivar super admin
   */
  async toggleActive(id: string): Promise<SuperAdminResponse> {
    if (!id) {
      throw new Error('ID es requerido');
    }

    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Super Admin no encontrado');
    }

    // Si se va a desactivar, verificar que no sea el último activo
    if (existing.activo) {
      const activeSuperAdmins = await this.repository.findActive();
      if (activeSuperAdmins.length === 1) {
        throw new Error('No se puede desactivar el último Super Admin activo');
      }
    }

    const updated = await this.repository.update(id, {
      activo: !existing.activo
    });

    return this.toResponse(updated);
  }
}
