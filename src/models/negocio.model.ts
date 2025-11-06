// src/models/negocio.model.ts

export interface NegocioResponse {
  id: string;
  nombre: string;
  telefono: string;
  logo: string | null;
  descripcion: string | null;
  usuarioId: string;
  
  // Agenda pública
  linkPublico: string | null;
  agendaPublica: boolean;
  mostrarPreciosPublico: boolean;
  
  // Notificaciones y Recordatorios
  notificacionesWhatsApp: boolean;
  notificacionesEmail: boolean;
  recordatorio1: number | null; // Minutos antes de la cita
  recordatorio2: number | null; // Recordatorio adicional opcional
  
  // Mensajes personalizables
  mensajeRecordatorio: string | null;
  mensajeReagendamiento: string | null;
  
  // Suscripción
  estadoSuscripcion: string;
  bloqueado: boolean;
  motivoBloqueo: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateNegocioDto {
  nombre?: string;
  telefono?: string;
  logo?: string | null;
  descripcion?: string | null;
}

export interface UpdateAgendaPublicaDto {
  linkPublico?: string | null;
  agendaPublica?: boolean;
  mostrarPreciosPublico?: boolean;
}

export interface UpdateNotificacionesDto {
  notificacionesWhatsApp?: boolean;
  notificacionesEmail?: boolean;
  recordatorio1?: number | null; // Minutos (null = deshabilitado)
  recordatorio2?: number | null; // Opcional
}

export interface UpdateMensajesWhatsAppDto {
  mensajeRecordatorio?: string;
  mensajeReagendamiento?: string;
}

export interface GenerarLinkPublicoResponse {
  linkPublico: string;
  urlCompleta: string;
}
