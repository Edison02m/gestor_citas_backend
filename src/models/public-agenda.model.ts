// src/models/public-agenda.model.ts

/**
 * DTOs para la agenda pública
 * Estos modelos se usan para las rutas públicas sin autenticación
 */

// ============================================================================
// DTO para crear cita desde agenda pública
// ============================================================================

export interface CreateCitaPublicaDto {
  // Datos del cliente (puede ser nuevo o existente por cédula)
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteEmail: string; // Obligatorio

  // Datos de la cita
  fecha: string; // "2024-10-23"
  horaInicio: string; // "09:00"
  horaFin: string; // "10:00"
  servicioId: string;
  empleadoId?: string; // Opcional - si no se especifica, se asigna según capacidad
  sucursalId: string;
  notas?: string;
}

// ============================================================================
// DTO para obtener disponibilidad desde agenda pública
// ============================================================================

export interface DisponibilidadPublicaDto {
  empleadoId?: string;
  sucursalId: string;
  servicioId: string;
  fecha: string; // "2024-10-23"
}

// ============================================================================
// Respuestas de información pública del negocio
// ============================================================================

export interface NegocioPublicoResponse {
  id: string;
  nombre: string;
  telefono: string;
  logo: string | null;
  descripcion: string | null;
  agendaPublica: boolean;
  mostrarPreciosPublico: boolean;
}

export interface SucursalPublicaResponse {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  googleMapsUrl?: string;
  ciudad: string;
  estado: string;
  // No incluir horarios aquí - se obtienen al calcular disponibilidad
}

export interface ServicioPublicoResponse {
  id: string;
  nombre: string;
  descripcion: string | null;
  duracion: number; // minutos
  precio: number;
  color: string;
  sucursales?: {
    sucursalId: string;
    disponible: boolean;
  }[];
}

export interface EmpleadoPublicoResponse {
  id: string;
  nombre: string;
  cargo: string;
  foto: string | null;
  // No incluir horarios ni datos sensibles
}

// ============================================================================
// Validaciones para agenda pública
// ============================================================================

export interface ValidacionCitaPublica {
  valida: boolean;
  errores: string[];
  advertencias?: string[];
}
