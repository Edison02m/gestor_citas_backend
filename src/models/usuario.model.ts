// src/models/usuario.model.ts

import { RolUsuario } from '@prisma/client';

export interface CreateUsuarioDto {
  // Datos del usuario
  email: string;
  password: string;
  
  // Datos del negocio
  nombre: string;
  telefono: string;
  logo?: string;
  descripcion?: string;
}

export interface UpdateUsuarioDto {
  email?: string;
  password?: string;
  nombre?: string;
  telefono?: string;
  logo?: string;
  descripcion?: string;
}

export interface UsuarioResponse {
  id: string;
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
  };
  createdAt: Date;
  updatedAt: Date;
}
