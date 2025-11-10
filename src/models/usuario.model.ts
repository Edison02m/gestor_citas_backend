// src/models/usuario.model.ts

import { RolUsuario } from '@prisma/client';

export interface CreateUsuarioDto {
  // Datos del usuario
  nombre: string;
  email: string;
  password: string;
  
  // Datos del negocio
  nombreNegocio: string;
  telefono: string;
  logo?: string;
  descripcion?: string;
}

export interface UpdateUsuarioDto {
  nombre?: string;
  email?: string;
  password?: string;
  nombreNegocio?: string;
  telefono?: string;
  logo?: string;
  descripcion?: string;
}

export interface UsuarioResponse {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  primerLogin: boolean;
  activo: boolean;
  negocio?: {
    id: string;
    nombre: string;
    telefono: string;
    logo?: string;
    descripcion?: string;
    estadoSuscripcion: string;
    // 🎯 Plan pendiente (sistema de cola)
    planPendiente?: string | null;
    fechaInicioPendiente?: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}
