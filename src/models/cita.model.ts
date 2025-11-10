// src/models/cita.model.ts

import { EstadoCita, CanalOrigen } from '@prisma/client';

// ============================================================================
// DTOs para Citas
// ============================================================================

export interface CreateCitaDto {
  fecha: string; // "2024-10-23"
  horaInicio: string; // "09:00"
  horaFin: string; // "10:00"
  clienteId: string;
  servicioId: string;
  empleadoId?: string; // Opcional
  sucursalId: string;
  notas?: string;
  canalOrigen?: CanalOrigen;
  // precioTotal se calcula automáticamente desde el servicio
}

export interface UpdateCitaDto {
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  servicioId?: string; // Si se cambia, el precio se recalcula automáticamente
  empleadoId?: string;
  sucursalId?: string;
  notas?: string;
  estado?: EstadoCita;
  // precioTotal se recalcula automáticamente si cambia servicioId
}

export interface FiltrosCitasDto {
  fechaInicio?: string;
  fechaFin?: string;
  clienteId?: string;
  empleadoId?: string;
  sucursalId?: string;
  servicioId?: string;
  estado?: EstadoCita;
  canalOrigen?: CanalOrigen;
  page?: number;
  limit?: number;
}

export interface CitaConRelaciones {
  id: string;
  fecha: Date;
  horaInicio: string; // Debe ser string para evitar conversión de zona horaria
  horaFin: string;    // Debe ser string para evitar conversión de zona horaria
  estado: EstadoCita;
  notas: string | null;
  precioTotal: number;
  canalOrigen: CanalOrigen;
  cliente: {
    id: string;
    nombre: string;
    telefono: string;
    email: string | null;
    cedula: string;
  };
  servicio: {
    id: string;
    nombre: string;
    duracion: number;
    precio: number;
    color: string;
  };
  empleado: {
    id: string;
    nombre: string;
    cargo: string;
    foto: string | null;
  } | null;
  sucursal: {
    id: string;
    nombre: string;
    direccion: string;
    telefono: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DisponibilidadEmpleadoDto {
  empleadoId?: string;
  sucursalId: string;
  servicioId: string;
  fecha: string; // "2024-10-23"
}

export interface HorarioDisponible {
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
}

export interface EstadisticasCitasDto {
  totalCitas: number;
  citasPendientes: number;
  citasConfirmadas: number;
  citasCompletadas: number;
  citasCanceladas: number;
  citasNoAsistio: number;
  ingresoTotal: number;
  ingresoMesActual: number;
}
