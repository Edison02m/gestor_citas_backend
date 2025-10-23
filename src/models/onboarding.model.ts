// src/models/onboarding.model.ts

export interface OnboardingStatusResponse {
  completado: boolean;
  pasoActual: number;
  pasos: {
    paso: number;
    nombre: string;
    completado: boolean;
    opcional: boolean;
  }[];
  negocio: {
    tieneSucursales: boolean;
    tieneServicios: boolean;
    tieneEmpleados: boolean;
  };
}

// ============================================================================
// PASO 2: SUCURSALES
// ============================================================================

export interface OnboardingSucursalDto {
  nombre: string;
  direccion: string;
  ciudad?: string;
  provincia?: string;
  telefono: string;
  email?: string;
  
  // Horarios (al menos los 7 días de la semana)
  horarios: {
    diaSemana: number; // 0-6
    abierto: boolean;
    horaApertura?: string; // "08:00"
    horaCierre?: string;   // "20:00"
    tieneDescanso: boolean;
    descansoInicio?: string; // "13:00"
    descansoFin?: string;    // "14:00"
  }[];
}

// ============================================================================
// PASO 3: SERVICIOS
// ============================================================================

export interface OnboardingServicioDto {
  nombre: string;
  descripcion: string;
  duracion: number; // minutos
  precio: number;
  foto?: string;
  color?: string; // Color para el calendario, ej: "#ff5733"
  
  // ¿En qué sucursales está disponible?
  sucursalIds: string[]; // ["uuid-sucursal-1", "uuid-sucursal-2"]
}

// ============================================================================
// PASO 4: EMPLEADOS (OPCIONAL)
// ============================================================================

export interface OnboardingEmpleadoDto {
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
  foto?: string;
  
  // Horarios del empleado
  horarios: {
    diaSemana: number; // 0-6
    horaInicio: string; // "09:00"
    horaFin: string;    // "18:00"
    tieneDescanso: boolean;
    descansoInicio?: string; // "13:00"
    descansoFin?: string;    // "14:00"
  }[];
  
  // ¿En qué sucursales trabaja?
  sucursalIds: string[];
}

// ============================================================================
// BATCH: Crear todo de una vez (opcional)
// ============================================================================

export interface OnboardingCompleteDto {
  sucursales: OnboardingSucursalDto[];
  servicios: OnboardingServicioDto[];
  empleados?: OnboardingEmpleadoDto[]; // Opcional
}
