// ============================================================================
// DTOs para SuperAdmin
// ============================================================================

export interface CreateSuperAdminDto {
  email: string;
  password: string;
  nombre: string;
}

export interface UpdateSuperAdminDto {
  email?: string;
  nombre?: string;
  password?: string;
  activo?: boolean;
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

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: SuperAdminResponse;
}

export interface SuperAdminListResponse {
  data: SuperAdminResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
