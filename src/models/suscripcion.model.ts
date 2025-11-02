// src/models/suscripcion.model.ts

export interface ActivarCodigoDto {
  codigo: string;
}

export interface ActivarCodigoResponse {
  success: true;
  data: {
    suscripcion: {
      id: string;
      fechaActivacion: Date;
      fechaVencimiento: Date;
      plan: string;
    };
    negocio: {
      estadoSuscripcion: string;
    };
    // 🎯 Sistema de cola de planes
    enCola?: boolean;
    planActual?: string | null;
    planPendiente?: string;
    fechaActivacionPendiente?: Date;
  };
  message: string;
}
