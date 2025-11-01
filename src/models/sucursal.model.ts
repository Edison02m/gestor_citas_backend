// src/models/sucursal.model.ts

export interface SucursalDto {
  nombre: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  telefono: string;
  email?: string;
  googleMapsUrl?: string;
  horarios: HorarioSucursalDto[];
}

export interface SucursalUpdateDto {
  nombre?: string;
  direccion?: string;
  ciudad?: string | null;
  provincia?: string | null;
  telefono?: string;
  email?: string | null;
  googleMapsUrl?: string | null;
  estado?: string; // "ACTIVA" | "INACTIVA"
}

export interface HorarioSucursalDto {
  diaSemana: number; // 0-6
  abierto: boolean;
  horaApertura?: string; // "08:00"
  horaCierre?: string;   // "20:00"
  tieneDescanso?: boolean;
  descansoInicio?: string; // "13:00"
  descansoFin?: string;    // "14:00"
}

export interface SucursalResponse {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string | null;
  provincia: string | null;
  telefono: string;
  email: string | null;
  googleMapsUrl: string | null;
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
  tieneDescanso: boolean;
  descansoInicio: string | null;
  descansoFin: string | null;
}
