// src/services/codigo-suscripcion.service.ts

import { PlanSuscripcion } from '@prisma/client';
import { CodigoSuscripcionRepository } from '../repositories/codigo-suscripcion.repository';
import {
  CreateCodigoSuscripcionDto,
  UpdateCodigoSuscripcionDto,
  CodigoSuscripcionResponse,
  CodigoSuscripcionListResponse,
  CodigoSuscripcionFilters,
  GenerarCodigosDto,
  EstadisticasCodigosResponse,
} from '../models/codigo-suscripcion.model';

export class CodigoSuscripcionService {
  constructor(private repository: CodigoSuscripcionRepository) {}

  /**
   * Generar código único
   */
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

  /**
   * Crear un código de suscripción
   */
  async create(
    dto: CreateCodigoSuscripcionDto
  ): Promise<CodigoSuscripcionResponse> {
    // Validaciones especiales para plan PRUEBA
    if (dto.plan === ('PRUEBA' as PlanSuscripcion)) {
      // Para PRUEBA, duracionMeses debe ser 0 (usamos días)
      if (dto.duracionMeses !== 0) {
        throw new Error('Para plan PRUEBA, la duración debe ser 0 (se usan 7 días fijos)');
      }
    } else {
      // Para otros planes, validar que duracionMeses > 0
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

    // Generar código único
    let codigo = this.generarCodigoUnico(dto.plan);
    let intentos = 0;

    // Asegurar que el código sea único
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

  /**
   * Generar múltiples códigos a la vez
   */
  async generarMultiples(
    dto: GenerarCodigosDto
  ): Promise<CodigoSuscripcionResponse[]> {
    // Validaciones
    if (dto.cantidad <= 0 || dto.cantidad > 100) {
      throw new Error('La cantidad debe estar entre 1 y 100');
    }

    if (dto.duracionMeses <= 0) {
      throw new Error('La duración debe ser mayor a 0 meses');
    }

    const codigos: CodigoSuscripcionResponse[] = [];

    for (let i = 0; i < dto.cantidad; i++) {
      const codigo = await this.create(
        {
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
        }
      );
      codigos.push(codigo);
    }

    return codigos;
  }

  /**
   * Obtener código por ID
   */
  async getById(id: string): Promise<CodigoSuscripcionResponse> {
    const codigo = await this.repository.findById(id);

    if (!codigo) {
      throw new Error('Código de suscripción no encontrado');
    }

    return this.toResponse(codigo);
  }

  /**
   * Obtener código por código de texto
   */
  async getByCodigo(codigo: string): Promise<CodigoSuscripcionResponse> {
    const codigoEncontrado = await this.repository.findByCodigo(codigo);

    if (!codigoEncontrado) {
      throw new Error('Código de suscripción no encontrado');
    }

    return this.toResponse(codigoEncontrado);
  }

  /**
   * Listar códigos con filtros y paginación
   */
  async getAll(
    filters: CodigoSuscripcionFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<CodigoSuscripcionListResponse> {
    // Validar paginación
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

  /**
   * Actualizar un código
   */
  async update(
    id: string,
    dto: UpdateCodigoSuscripcionDto
  ): Promise<CodigoSuscripcionResponse> {
    // Verificar que existe
    const codigoExistente = await this.repository.findById(id);
    if (!codigoExistente) {
      throw new Error('Código de suscripción no encontrado');
    }

    // No permitir editar si ya fue usado (salvo notas)
    if (codigoExistente.usado) {
      // Solo permitir actualizar notas
      if (Object.keys(dto).some((key) => key !== 'notas')) {
        throw new Error(
          'No se puede editar un código ya usado. Solo se pueden agregar notas.'
        );
      }
    }

    // Validaciones
    if (dto.usoMaximo && dto.usoMaximo < codigoExistente.vecesUsado) {
      throw new Error(
        `El uso máximo no puede ser menor que las veces usado (${codigoExistente.vecesUsado})`
      );
    }

    if (dto.fechaExpiracion && dto.fechaExpiracion < new Date()) {
      throw new Error('La fecha de expiración no puede ser en el pasado');
    }

    const codigoActualizado = await this.repository.update(id, dto);

    return this.toResponse(codigoActualizado);
  }

  /**
   * Eliminar un código
   */
  async delete(id: string): Promise<void> {
    const codigo = await this.repository.findById(id);

    if (!codigo) {
      throw new Error('Código de suscripción no encontrado');
    }

    // No permitir eliminar si ya fue usado
    if (codigo.usado || codigo.vecesUsado > 0) {
      throw new Error('No se puede eliminar un código que ya ha sido usado');
    }

    await this.repository.delete(id);
  }

  /**
   * Validar si un código está disponible para usar
   */
  async validarDisponibilidad(codigo: string): Promise<{
    disponible: boolean;
    motivo?: string;
    detalles?: any;
  }> {
    const codigoEncontrado = await this.repository.findByCodigo(codigo);

    if (!codigoEncontrado) {
      return {
        disponible: false,
        motivo: 'Código no encontrado',
      };
    }

    // Verificar si ya fue usado completamente
    if (codigoEncontrado.vecesUsado >= codigoEncontrado.usoMaximo) {
      return {
        disponible: false,
        motivo: 'Código ya utilizado',
        detalles: {
          vecesUsado: codigoEncontrado.vecesUsado,
          usoMaximo: codigoEncontrado.usoMaximo,
        },
      };
    }

    // Verificar si expiró
    if (
      codigoEncontrado.fechaExpiracion &&
      codigoEncontrado.fechaExpiracion < new Date()
    ) {
      return {
        disponible: false,
        motivo: 'Código expirado',
        detalles: {
          fechaExpiracion: codigoEncontrado.fechaExpiracion,
        },
      };
    }

    return {
      disponible: true,
      detalles: this.toResponse(codigoEncontrado),
    };
  }

  /**
   * Obtener estadísticas de códigos
   */
  async getEstadisticas(): Promise<EstadisticasCodigosResponse> {
    const stats = await this.repository.getEstadisticas();

    // Transformar estadísticas por plan
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

  /**
   * Obtener códigos próximos a vencer
   */
  async getProximosAVencer(dias: number = 30) {
    if (dias < 1 || dias > 365) {
      throw new Error('Los días deben estar entre 1 y 365');
    }

    const codigos = await this.repository.findProximosAVencer(dias);
    return codigos.map((codigo: any) => this.toResponse(codigo));
  }

  /**
   * Convertir a DTO de respuesta
   */
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
