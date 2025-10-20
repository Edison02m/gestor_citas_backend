// src/models/sucursal.model.ts

export interface SucursalDto {
  nombre: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  telefono: string;
  email?: string;
}

export interface SucursalResponse {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string | null;
  provincia: string | null;
  telefono: string;
  email: string | null;
  estado: string;
  negocioId: string;
  createdAt: Date;
  updatedAt: Date;
  horarios?: HorarioSucursalResponse[];
}

export interface HorarioSucursalResponse {
  id: string;
  diaSemana: number;
  abierto: boolean;
  horaApertura: string | null;
  horaCierre: string | null;
}
