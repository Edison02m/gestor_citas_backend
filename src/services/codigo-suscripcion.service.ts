import { PlanSuscripcion } from '@prisma/client';
import { CodigoSuscripcionRepository } from '../repositories/codigo-suscripcion.repository';
import {
  CreateCodigoSuscripcionDto,
  CodigoSuscripcionResponse,
  CodigoSuscripcionListResponse,
  CodigoSuscripcionFilters,
  GenerarCodigosDto,
  EstadisticasCodigosResponse,
} from '../models/codigo-suscripcion.model';

export class CodigoSuscripcionService {
  constructor(private repository: CodigoSuscripcionRepository) {}

  private generarCodigoUnico(plan: PlanSuscripcion): string {
    const prefijos: Record<PlanSuscripcion, string> = {
      PRUEBA: 'PRU',
      MENSUAL: 'MEN',
      TRIMESTRAL: 'TRI',
      SEMESTRAL: 'SEM',
      ANUAL: 'ANU',
      PERSONALIZADO: 'PER',
    };

    const prefijo = prefijos[plan];
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    return `${prefijo}-${year}-${random}`;
  }

  async create(dto: CreateCodigoSuscripcionDto): Promise<CodigoSuscripcionResponse> {
    if (dto.plan === ('PRUEBA' as PlanSuscripcion)) {
      if (dto.duracionMeses !== 0) {
        throw new Error('Para plan PRUEBA, la duración debe ser 0 (se usan 7 días fijos)');
      }
    } else {
      if (dto.duracionMeses <= 0) {
        throw new Error('La duración debe ser mayor a 0 meses');
      }
    }

    if (dto.usoMaximo && dto.usoMaximo < 1) {
      throw new Error('El uso máximo debe ser al menos 1');
    }

    if (dto.fechaExpiracion && dto.fechaExpiracion < new Date()) {
      throw new Error('La fecha de expiración no puede ser en el pasado');
    }

    let codigo = this.generarCodigoUnico(dto.plan);
    let intentos = 0;

    while (await this.repository.codigoExists(codigo)) {
      if (intentos > 10) {
        throw new Error('No se pudo generar un código único. Intente nuevamente.');
      }
      codigo = this.generarCodigoUnico(dto.plan);
      intentos++;
    }

    const codigoCreado = await this.repository.create({
      codigo,
      plan: dto.plan,
      duracionMeses: dto.duracionMeses,
      descripcion: dto.descripcion,
      precio: dto.precio,
      fechaExpiracion: dto.fechaExpiracion,
      usoMaximo: dto.usoMaximo || 1,
      motivoCreacion: dto.motivoCreacion,
      notas: dto.notas,
    });

    return this.toResponse(codigoCreado);
  }

  async generarMultiples(dto: GenerarCodigosDto): Promise<CodigoSuscripcionResponse[]> {
    if (dto.cantidad <= 0 || dto.cantidad > 100) {
      throw new Error('La cantidad debe estar entre 1 y 100');
    }

    if (dto.duracionMeses <= 0) {
      throw new Error('La duración debe ser mayor a 0 meses');
    }

    const codigos: CodigoSuscripcionResponse[] = [];

    for (let i = 0; i < dto.cantidad; i++) {
      const codigo = await this.create({
        plan: dto.plan,
        duracionMeses: dto.duracionMeses,
        descripcion: dto.descripcion
          ? `${dto.descripcion} (${i + 1}/${dto.cantidad})`
          : undefined,
        precio: dto.precio,
        fechaExpiracion: dto.fechaExpiracion,
        usoMaximo: dto.usoMaximo,
        motivoCreacion: dto.motivoCreacion,
        notas: dto.notas,
      });
      codigos.push(codigo);
    }

    return codigos;
  }

  async getAll(
    filters: CodigoSuscripcionFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<CodigoSuscripcionListResponse> {
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const { codigos, total } = await this.repository.findAll(filters, page, limit);

    return {
      codigos: codigos.map((codigo: any) => this.toResponse(codigo)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: string): Promise<void> {
    const codigo = await this.repository.findById(id);

    if (!codigo) {
      throw new Error('Código de suscripción no encontrado');
    }

    if (codigo.usado || codigo.vecesUsado > 0) {
      throw new Error('No se puede eliminar un código que ya ha sido usado');
    }

    await this.repository.delete(id);
  }

  async getEstadisticas(): Promise<EstadisticasCodigosResponse> {
    const stats = await this.repository.getEstadisticas();

    const porPlan: EstadisticasCodigosResponse['porPlan'] = {};

    for (const item of stats.porPlan) {
      const plan = item.plan as PlanSuscripcion;
      const total = item._count;
      const usados = item._sum.vecesUsado || 0;

      porPlan[plan] = {
        total,
        usados,
        disponibles: total - usados,
      };
    }

    return {
      total: stats.total,
      usados: stats.usados,
      disponibles: stats.disponibles,
      expirados: stats.expirados,
      porPlan,
    };
  }

  private toResponse(codigo: any): CodigoSuscripcionResponse {
    return {
      id: codigo.id,
      codigo: codigo.codigo,
      plan: codigo.plan,
      duracionMeses: codigo.duracionMeses,
      descripcion: codigo.descripcion || undefined,
      precio: codigo.precio ? parseFloat(codigo.precio.toString()) : undefined,
      usado: codigo.usado,
      fechaUso: codigo.fechaUso || undefined,
      fechaExpiracion: codigo.fechaExpiracion || undefined,
      usoMaximo: codigo.usoMaximo,
      vecesUsado: codigo.vecesUsado,
      motivoCreacion: codigo.motivoCreacion || undefined,
      notas: codigo.notas || undefined,
      createdAt: codigo.createdAt,
      updatedAt: codigo.updatedAt,
    };
  }
}
