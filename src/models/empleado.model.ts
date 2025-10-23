// src/models/empleado.model.ts

export interface EmpleadoDto {
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  foto?: string;
}

export interface EmpleadoResponse {
  id: string;
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  foto?: string | null;
  estado: string;
  negocioId: string;
  horarios?: HorarioEmpleadoResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EmpleadoUpdateDto {
  nombre?: string;
  cargo?: string;
  telefono?: string;
  email?: string;
  foto?: string | null;
  estado?: string;
}

export interface HorarioEmpleadoDto {
  diaSemana: number; // 0=Domingo, 1=Lunes, ..., 6=Sábado
  horaInicio: string; // "09:00"
  horaFin: string; // "18:00"
  tieneDescanso?: boolean;
  descansoInicio?: string; // "13:00"
  descansoFin?: string; // "14:00"
}

export interface HorarioEmpleadoResponse {
  id: string;
  empleadoId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  tieneDescanso: boolean;
  descansoInicio?: string | null;
  descansoFin?: string | null;
}

export interface BloqueoEmpleadoDto {
  fechaInicio: Date;
  fechaFin: Date;
  motivo?: string;
  todoElDia?: boolean;
  horaInicio?: string;
  horaFin?: string;
}

export interface BloqueoEmpleadoResponse {
  id: string;
  empleadoId: string;
  fechaInicio: Date;
  fechaFin: Date;
  motivo?: string | null;
  todoElDia: boolean;
  horaInicio?: string | null;
  horaFin?: string | null;
  createdAt: Date;
}

export interface EmpleadosListResponse {
  empleados: EmpleadoResponse[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export interface SucursalAsignacionDto {
  sucursalId: string;
}

export interface EmpleadoSucursalResponse {
  empleadoId: string;
  sucursalId: string;
  asignadoEn: Date;
  sucursal?: {
    id: string;
    nombre: string;
    direccion: string;
    telefono: string;
  };
}
