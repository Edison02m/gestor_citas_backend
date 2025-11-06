// src/services/negocio.service.ts

import { NegocioRepository } from '../repositories/negocio.repository';
import {
  NegocioResponse,
  UpdateNegocioDto,
  UpdateAgendaPublicaDto,
  UpdateNotificacionesDto,
  UpdateMensajesWhatsAppDto,
  GenerarLinkPublicoResponse,
} from '../models/negocio.model';

export class NegocioService {
  constructor(
    private negocioRepository: NegocioRepository
  ) {}

  /**
   * Obtener información completa del negocio
   */
  async obtenerNegocio(usuarioId: string): Promise<NegocioResponse> {
    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    return {
      id: negocio.id,
      nombre: negocio.nombre,
      telefono: negocio.telefono,
      logo: negocio.logo,
      descripcion: negocio.descripcion,
      usuarioId: negocio.usuarioId,
      linkPublico: negocio.linkPublico,
      agendaPublica: negocio.agendaPublica,
      mostrarPreciosPublico: negocio.mostrarPreciosPublico,
      notificacionesWhatsApp: negocio.notificacionesWhatsApp,
      notificacionesEmail: negocio.notificacionesEmail,
      recordatorio1: negocio.recordatorio1,
      recordatorio2: negocio.recordatorio2,
      mensajeRecordatorio: negocio.mensajeRecordatorio,
      mensajeReagendamiento: negocio.mensajeReagendamiento,
      estadoSuscripcion: negocio.estadoSuscripcion,
      bloqueado: negocio.bloqueado,
      motivoBloqueo: negocio.motivoBloqueo,
      createdAt: negocio.createdAt,
      updatedAt: negocio.updatedAt,
    };
  }

  /**
   * Actualizar información básica del negocio
   */
  async actualizarNegocio(
    usuarioId: string,
    dto: UpdateNegocioDto
  ): Promise<NegocioResponse> {
    // Validar que el negocio existe
    const negocioExistente = await this.negocioRepository.findByUsuarioId(usuarioId);
    if (!negocioExistente) {
      throw new Error('Negocio no encontrado');
    }

    // Validaciones
    if (dto.nombre !== undefined) {
      if (!dto.nombre || dto.nombre.trim().length < 2) {
        throw new Error('El nombre del negocio debe tener al menos 2 caracteres');
      }
      dto.nombre = dto.nombre.trim();
    }

    if (dto.telefono !== undefined) {
      if (!dto.telefono || dto.telefono.trim().length < 7) {
        throw new Error('El teléfono debe tener al menos 7 caracteres');
      }
      dto.telefono = dto.telefono.trim();
    }

    if (dto.descripcion !== undefined && dto.descripcion !== null) {
      dto.descripcion = dto.descripcion.trim();
    }

    // Actualizar
    await this.negocioRepository.update(
      negocioExistente.id,
      dto
    );

    return this.obtenerNegocio(usuarioId);
  }

  /**
   * Actualizar configuración de agenda pública
   */
  async actualizarAgendaPublica(
    usuarioId: string,
    dto: UpdateAgendaPublicaDto
  ): Promise<NegocioResponse> {
    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);
    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Si se está cambiando el linkPublico, validar que no exista
    if (dto.linkPublico !== undefined && dto.linkPublico !== null) {
      // Validar formato ANTES de normalizar (para dar mejor feedback al usuario)
      if (!/^[a-zA-Z0-9-]+$/.test(dto.linkPublico)) {
        throw new Error('El link solo puede contener letras minúsculas, números y guiones');
      }

      // Normalizar el link
      const linkNormalizado = this.normalizarLink(dto.linkPublico);
      
      if (linkNormalizado.length < 3) {
        throw new Error('El link debe tener al menos 3 caracteres');
      }

      // Verificar que no exista (excepto si es el mismo negocio)
      const negocioConLink = await this.negocioRepository.findByLinkPublico(linkNormalizado);
      if (negocioConLink && negocioConLink.id !== negocio.id) {
        throw new Error('Este link público ya está en uso');
      }

      dto.linkPublico = linkNormalizado;
    }

    await this.negocioRepository.updateAgendaPublica(negocio.id, dto);

    return this.obtenerNegocio(usuarioId);
  }

  /**
   * Actualizar configuración de notificaciones y recordatorios
   */
  async actualizarNotificaciones(
    usuarioId: string,
    dto: UpdateNotificacionesDto
  ): Promise<NegocioResponse> {
    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);
    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Validar recordatorios (en minutos)
    if (dto.recordatorio1 !== undefined && dto.recordatorio1 !== null) {
      if (dto.recordatorio1 < 0 || dto.recordatorio1 > 10080) { // Máximo 7 días (10080 minutos)
        throw new Error('El recordatorio 1 debe estar entre 0 y 10080 minutos (7 días)');
      }
    }

    if (dto.recordatorio2 !== undefined && dto.recordatorio2 !== null) {
      if (dto.recordatorio2 < 0 || dto.recordatorio2 > 10080) {
        throw new Error('El recordatorio 2 debe estar entre 0 y 10080 minutos (7 días)');
      }
    }

    await this.negocioRepository.updateNotificaciones(negocio.id, dto);

    return this.obtenerNegocio(usuarioId);
  }

  /**
   * Actualizar mensajes personalizables de WhatsApp
   */
  async actualizarMensajesWhatsApp(
    usuarioId: string,
    dto: UpdateMensajesWhatsAppDto
  ): Promise<NegocioResponse> {
    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);
    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Validar que los mensajes contengan las variables necesarias
    // Solo requerimos cliente y fecha. Hora puede ser {hora}, {hora_inicio} o {hora_fin}
    if (dto.mensajeRecordatorio !== undefined) {
      const variablesRequeridas = ['{cliente}', '{fecha}'];
      const faltanVariables = variablesRequeridas.filter(v => !dto.mensajeRecordatorio?.includes(v));
      if (faltanVariables.length > 0) {
        throw new Error(`El mensaje de recordatorio debe incluir: ${faltanVariables.join(', ')}`);
      }
    }

    if (dto.mensajeReagendamiento !== undefined) {
      const variablesRequeridas = ['{cliente}', '{fecha}'];
      const faltanVariables = variablesRequeridas.filter(v => !dto.mensajeReagendamiento?.includes(v));
      if (faltanVariables.length > 0) {
        throw new Error(`El mensaje de reagendamiento debe incluir: ${faltanVariables.join(', ')}`);
      }
    }

    await this.negocioRepository.updateMensajesWhatsApp(negocio.id, dto);

    return this.obtenerNegocio(usuarioId);
  }

  /**
   * Generar link público automáticamente basado en el nombre del negocio
   */
  async generarLinkPublico(usuarioId: string): Promise<GenerarLinkPublicoResponse> {
    const negocio = await this.negocioRepository.findByUsuarioId(usuarioId);
    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Normalizar el nombre del negocio
    const linkBase = this.normalizarLink(negocio.nombre);

    // Generar link único
    const linkPublico = await this.negocioRepository.generarLinkPublico(
      negocio.id,
      linkBase
    );

    // URL completa (esto se puede configurar desde variables de entorno)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const urlCompleta = `${baseUrl}/agenda/${linkPublico}`;

    return {
      linkPublico,
      urlCompleta,
    };
  }

  /**
   * Normalizar un string para usarlo como link público
   */
  private normalizarLink(texto: string): string {
    return texto
      .normalize('NFD') // Descomponer caracteres con acento
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales por guiones
      .replace(/^-+|-+$/g, '') // Remover guiones al inicio y final
      .substring(0, 50); // Limitar longitud
  }
}
