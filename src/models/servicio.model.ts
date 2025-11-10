// src/models/servicio.model.ts

export interface ServicioDto {
  nombre: string;
  descripcion?: string; // Opcional
  duracion: number; // Duración en minutos
  precio: number;
  foto?: string;
  color?: string; // Color para el calendario
  sucursales: string[]; // IDs de sucursales donde estará disponible
}

export interface ServicioUpdateDto {
  nombre?: string;
  descripcion?: string;
  duracion?: number;
  precio?: number;
  foto?: string | null;
  color?: string;
  estado?: string; // "ACTIVO" | "INACTIVO"
}

export interface AsignarSucursalesDto {
  sucursales: string[]; // IDs de sucursales
}

export interface ServicioResponse {
  id: string;
  nombre: string;
  descripcion: string;
  duracion: number;
  precio: number;
  foto: string | null;
  color: string;
  estado: string;
  negocioId: string;
  createdAt: Date;
  updatedAt: Date;
  sucursales?: SucursalServicioResponse[];
}

export interface SucursalServicioResponse {
  sucursalId: string;
  disponible: boolean;
  asignadoEn: Date;
  sucursal?: {
    id: string;
    nombre: string;
    direccion: string;
    ciudad: string | null;
    estado: string;
  };
}
