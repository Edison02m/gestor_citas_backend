import { PrismaClient, EstadoSuscripcion } from '@prisma/client';

export class SuscripcionVerificationService {
  constructor(private prisma: PrismaClient) {}

  async verificarYActualizarSuscripcion(negocioId: string): Promise<{
    estadoAnterior: EstadoSuscripcion;
    estadoActual: EstadoSuscripcion;
    cambioEstado: boolean;
    fechaVencimiento: Date | null;
    diasRestantes: number | null;
  }> {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      include: {
        suscripcion: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    const estadoAnterior = negocio.estadoSuscripcion;
    let estadoActual = estadoAnterior;
    let cambioEstado = false;
    let fechaVencimiento: Date | null = null;

    if (estadoAnterior === EstadoSuscripcion.ACTIVA && negocio.suscripcion) {
      fechaVencimiento = negocio.suscripcion.fechaVencimiento;
      
      const ahora = new Date();
      const fechaVencimientoDate = new Date(fechaVencimiento);

      if (fechaVencimientoDate < ahora) {
        await this.prisma.negocio.update({
          where: { id: negocioId },
          data: {
            estadoSuscripcion: EstadoSuscripcion.VENCIDA,
          },
        });

        await this.prisma.suscripcion.update({
          where: { id: negocio.suscripcion.id },
          data: {
            activa: false,
          },
        });

        await this.prisma.historialSuscripcion.create({
          data: {
            suscripcionId: negocio.suscripcion.id,
            accion: 'VENCIMIENTO',
            descripcion: `Suscripción vencida el ${fechaVencimientoDate.toISOString()}`,
          },
        });

        estadoActual = EstadoSuscripcion.VENCIDA;
        cambioEstado = true;
      }
    }

    let diasRestantes: number | null = null;
    if (fechaVencimiento && estadoActual === EstadoSuscripcion.ACTIVA) {
      const ahora = new Date();
      const fechaVencimientoDate = new Date(fechaVencimiento);
      const diffTime = fechaVencimientoDate.getTime() - ahora.getTime();
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      estadoAnterior,
      estadoActual,
      cambioEstado,
      fechaVencimiento,
      diasRestantes,
    };
  }
}
