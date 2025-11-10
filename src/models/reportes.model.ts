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
// NUEVAS ESTADÍSTICAS - PRIORIDAD ALTA
// ============================================================================

// 1. Tasa de Utilización de Horarios
export interface TasaUtilizacion {
  empleadoId?: string;
  empleadoNombre?: string;
  sucursalId?: string;
  sucursalNombre?: string;
  horasDisponibles: number; // Total de horas disponibles según horarios
  horasTrabajadas: number; // Horas realmente trabajadas (suma duración citas)
  tasaUtilizacion: number; // (horasTrabajadas / horasDisponibles) * 100
  citasTotales: number;
  espaciosVacios: number; // Huecos mayores a 30 min
}

// 2. Ingresos por Hora
export interface IngresosPorHora {
  empleadoId?: string;
  empleadoNombre?: string;
  ingresoTotal: number;
  horasTrabajadas: number;
  ingresoPorHora: number;
  mejorDia: { dia: string; ingreso: number };
  mejorHorario: { hora: string; ingreso: number };
  tendencia: 'creciente' | 'estable' | 'decreciente';
}

// 3. Ranking de Empleados
export interface RankingEmpleado {
  posicion: number;
  empleadoId: string;
  nombre: string;
  foto?: string;
  cargo: string;
  totalCitas: number;
  ingresoGenerado: number;
  tasaCompletacion: number; // (citasCompletadas / totalCitas) * 100
  tasaUtilizacion: number;
  ingresoPorHora: number;
  calificacionPromedio?: number; // Para futuro
  puntuacionTotal: number; // Score combinado para ranking
}

// 4. Horas/Días Pico
export interface HorasPico {
  diaMasConcurrido: string; // "Viernes"
  diaMasConcurridoCitas: number;
  horaMasConcurrida: string; // "14:00"
  horaMasConcurridaCitas: number;
  citasPorDia: { dia: string; citas: number; ingresos: number }[];
  citasPorHora: { hora: string; citas: number; ingresos: number }[];
  horasMenosConcurridas: string[];
  recomendaciones?: string[]; // Sugerencias de optimización
}

// 5. Valor de Vida del Cliente (CLV)
export interface ValorVidaCliente {
  clv: number; // Promedio de ingresos por cliente
  clientesTotales: number;
  clientesNuevos: number; // Primera cita en este periodo
  clientesRecurrentes: number; // Con citas previas
  tasaRetencion: number; // (clientesRecurrentes / clientesTotales) * 100
  frecuenciaPromedio: number; // Citas promedio por cliente
  ticketPromedio: number; // Gasto promedio por cita
  topClientes: {
    clienteId: string;
    nombre: string;
    totalGastado: number;
    totalCitas: number;
  }[];
}

// ============================================================================
// Response Completo del Dashboard
// ============================================================================

export interface DashboardReportesResponse {
  dashboard: DashboardStats;
  clientesFrecuentes: ClienteFrecuente[];
  serviciosMasVendidos: ServicioVendido[];
  citasPorDia: DatoTemporal[];
  // NUEVAS ESTADÍSTICAS
  tasaUtilizacion?: TasaUtilizacion[];
  ingresosPorHora?: IngresosPorHora[];
  rankingEmpleados?: RankingEmpleado[];
  horasPico?: HorasPico;
  valorVidaCliente?: ValorVidaCliente;
}
