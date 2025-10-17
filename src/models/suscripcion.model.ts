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
      fechaVencimiento: Date;
    };
  };
  message: string;
}
