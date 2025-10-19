// src/models/codigo-suscripcion.model.ts

import { PlanSuscripcion } from '@prisma/client';

export interface CreateCodigoSuscripcionDto {
  plan: PlanSuscripcion;
  duracionMeses: number;
  descripcion?: string;
  precio?: number;
  fechaExpiracion?: Date;
  usoMaximo?: number;
  motivoCreacion?: string;
  notas?: string;
}

export interface CodigoSuscripcionResponse {
  id: string;
  codigo: string;
  plan: PlanSuscripcion;
  duracionMeses: number;
  descripcion?: string;
  precio?: number;
  usado: boolean;
  fechaUso?: Date;
  fechaExpiracion?: Date;
  usoMaximo: number;
  vecesUsado: number;
  motivoCreacion?: string;
  notas?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CodigoSuscripcionListResponse {
  codigos: CodigoSuscripcionResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CodigoSuscripcionFilters {
  plan?: PlanSuscripcion;
  usado?: boolean;
  expirado?: boolean;
  disponible?: boolean;
  search?: string;
}

export interface GenerarCodigosDto {
  plan: PlanSuscripcion;
  duracionMeses: number;
  cantidad: number;
  descripcion?: string;
  precio?: number;
  fechaExpiracion?: Date;
  usoMaximo?: number;
  motivoCreacion?: string;
  notas?: string;
}

export interface EstadisticasCodigosResponse {
  total: number;
  usados: number;
  disponibles: number;
  expirados: number;
  porPlan: {
    [key in PlanSuscripcion]?: {
      total: number;
      usados: number;
      disponibles: number;
    };
  };
}
