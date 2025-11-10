import { PrismaClient } from '@prisma/client';

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export class SuscripcionRepository {
  constructor(private prisma: PrismaClient) {}

  async findByNegocioId(negocioId: string, tx?: TransactionClient) {
    const client = tx || this.prisma;
    return await client.suscripcion.findUnique({
      where: { negocioId },
      include: {
        codigoSuscripcion: true,
      },
    });
  }

  async create(
    data: {
      negocioId: string;
      codigoId: string;
      fechaActivacion: Date;
      fechaVencimiento: Date;
      activa: boolean;
    },
    tx?: TransactionClient
  ) {
    const client = tx || this.prisma;
    return await client.suscripcion.create({
      data,
      include: {
        codigoSuscripcion: true,
      },
    });
  }

  async update(
    negocioId: string,
    data: {
      codigoId: string;
      fechaActivacion: Date;
      fechaVencimiento: Date;
      activa: boolean;
      // 🧹 Campos opcionales para limpiar cola
      planPendiente?: string | null;
      codigoPendienteId?: string | null;
      fechaInicioPendiente?: Date | null;
    },
    tx?: TransactionClient
  ) {
    const client = tx || this.prisma;
    return await client.suscripcion.update({
      where: { negocioId },
      data,
      include: {
        codigoSuscripcion: true,
      },
    });
  }
}
