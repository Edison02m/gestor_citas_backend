// src/models/reportes.model.ts

// ============================================================================
// DTOs de Request (Filtros)
// ============================================================================

export interface FiltrosReportesDto {
  fechaInicio?: string; // YYYY-MM-DD
  fechaFin?: string; // YYYY-MM-DD
  empleadoId?: string;
  servicioId?: string;
  sucursalId?: string;
  clienteId?: string;
}

export interface FiltrosClientesFrecuentesDto extends FiltrosReportesDto {
  limit?: number; // Default: 10
}

export interface FiltrosServiciosVendidosDto extends FiltrosReportesDto {
  limit?: number; // Default: 10
}

export interface FiltrosAnalisisTemporalDto extends FiltrosReportesDto {
  tipo: 'dia' | 'semana' | 'hora';
}

// ============================================================================
// Interfaces de Response
// ============================================================================

// Dashboard General
export interface DashboardStats {
  periodoActual: PeriodoStats;
  comparacionPeriodoAnterior?: ComparacionPeriodo;
}

export interface PeriodoStats {
  fechaInicio: string;
  fechaFin: string;
  totalCitas: number;
  citasCompletadas: number;
  citasCanceladas: number;
  citasNoAsistio: number;
  citasPendientes: number;
  citasConfirmadas: number;
  tasaAsistencia: number; // Porcentaje (0-100)
  tasaCancelacion: number; // Porcentaje (0-100)
  ingresoTotal: number;
  ingresoPromedioPorCita: number;
}

export interface ComparacionPeriodo {
  variacionCitas: string; // "+12%"
  variacionIngresos: string; // "+8%"
  variacionTasaAsistencia: string; // "-2%"
}

// Clientes Frecuentes
export interface ClienteFrecuente {
  clienteId: string;
  nombre: string;
  telefono: string;
  email?: string;
  totalCitas: number;
  ultimaCita?: string; // YYYY-MM-DD
  ingresoGenerado: number;
  servicioFavorito?: string;
  servicioFavoritoId?: string;
}

// Servicios Más Vendidos
export interface ServicioVendido {
  servicioId: string;
  nombre: string;
  color: string;
  foto?: string;
  totalVentas: number;
  ingresoGenerado: number;
  porcentajeDelTotal: number; // Porcentaje (0-100)
  duracionPromedio: number; // Minutos
  precioPromedio: number;
}

// Ocupación de Empleados
export interface OcupacionEmpleado {
  empleadoId: string;
  nombre: string;
  foto?: string;
  cargo: string;
  totalCitasAtendidas: number;
  horasTrabajadas: number; // Suma de duraciones en horas
  ingresoGenerado: number;
  tasaOcupacion?: number; // Porcentaje (0-100) - vs horas disponibles
  citasPorDia: number;
  servicioMasRealizado?: string;
  servicioMasRealizadoId?: string;
}

// Análisis Temporal
export interface AnalisisTemporal {
  tipo: 'dia' | 'semana' | 'hora';
  datos: DatoTemporal[];
}

export interface DatoTemporal {
  label: string; // "2024-11-01", "Lunes", "09:00"
  totalCitas: number;
  ingresos: number;
  citasCompletadas: number;
  citasCanceladas: number;
}

// Análisis por Día de la Semana
export interface CitasPorDiaSemana {
  domingo: number;
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
  sabado: number;
}

// ============================================================================
// Response Completo del Dashboard
// ============================================================================

export interface DashboardReportesResponse {
  dashboard: DashboardStats;
  clientesFrecuentes: ClienteFrecuente[];
  serviciosMasVendidos: ServicioVendido[];
  citasPorDia: DatoTemporal[];
}
