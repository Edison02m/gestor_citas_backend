export interface CreateSuperAdminDto {
  email: string;
  password: string;
  nombre: string;
}

export interface SuperAdminResponse {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}
