// src/models/cliente.model.ts

export interface ClienteDto {
  nombre: string;
  cedula: string;
  telefono: string;
  email?: string;
  notas?: string;
}

export interface ClienteResponse {
  id: string;
  nombre: string;
  cedula: string;
  telefono: string;
  email?: string | null;
  notas?: string | null;
  negocioId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClienteUpdateDto {
  nombre?: string;
  cedula?: string;
  telefono?: string;
  email?: string | null;
  notas?: string | null;
}

export interface ClientesListResponse {
  clientes: ClienteResponse[];
  total: number;
  pagina: number;
  totalPaginas: number;
}
