// src/repositories/negocio.repository.ts

import { PrismaClient, EstadoSuscripcion } from '@prisma/client';
import { UpdateNegocioDto, UpdateAgendaPublicaDto, UpdateNotificacionesDto, UpdateMensajesWhatsAppDto } from '../models/negocio.model';

export class NegocioRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Crear un negocio
   */
  async create(data: {
    nombre: string;
    telefono: string;
    usuarioId: string;
    descripcion?: string;
    logo?: string;
  }) {
    // Generar link público único a partir del nombre del negocio
    const linkPublico = await this.generarLinkPublicoUnico(data.nombre);

    return await this.prisma.negocio.create({
      data: {
        nombre: data.nombre,
        telefono: data.telefono,
        usuarioId: data.usuarioId,
        descripcion: data.descripcion,
        logo: data.logo,
        linkPublico,
        agendaPublica: true, // Habilitada por defecto
        estadoSuscripcion: EstadoSuscripcion.SIN_SUSCRIPCION,
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Generar link público único basado en el nombre del negocio
   */
  private async generarLinkPublicoUnico(nombreNegocio: string): Promise<string> {
    // Normalizar el nombre: remover acentos, espacios, caracteres especiales
    let baseLink = nombreNegocio
      .normalize('NFD') // Descomponer caracteres con acento
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales por guiones
      .replace(/^-+|-+$/g, ''); // Remover guiones al inicio y final

    // Si queda vacío, usar un nombre genérico
    if (!baseLink) {
      baseLink = 'negocio';
    }

    // Verificar si el link ya existe
    let linkPublico = baseLink;
    let contador = 1;
    
    while (await this.existeLinkPublico(linkPublico)) {
      linkPublico = `${baseLink}-${contador}`;
      contador++;
    }

    return linkPublico;
  }

  /**
   * Verificar si un link público ya existe
   */
  private async existeLinkPublico(linkPublico: string): Promise<boolean> {
    const negocio = await this.prisma.negocio.findUnique({
      where: { linkPublico },
      select: { id: true },
    });
    return !!negocio;
  }

  /**
   * Buscar negocio por ID
   */
  async findById(id: string) {
    return await this.prisma.negocio.findUnique({
      where: { id },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
          },
        },
        suscripcion: true,
      },
    });
  }

  /**
   * Buscar negocio por usuario
   */
  async findByUsuarioId(usuarioId: string) {
    return await this.prisma.negocio.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            nombre: true,
          },
        },
        suscripcion: {
          select: {
            id: true,
            fechaActivacion: true,
            fechaVencimiento: true,
            activa: true,
            renovacionAuto: true,
            codigoId: true,
          },
        },
        _count: {
          select: {
            sucursales: true,
            servicios: true,
            empleados: true,
            clientes: true,
            citas: true,
          },
        },
      },
    });
  }

  /**
   * Buscar negocio por link público (para validar unicidad)
   */
  async findByLinkPublico(linkPublico: string) {
    return await this.prisma.negocio.findUnique({
      where: { linkPublico },
      select: {
        id: true,
        linkPublico: true,
      },
    });
  }

  /**
   * Actualizar negocio (información básica)
   */
  async update(
    id: string,
    data: UpdateNegocioDto
  ) {
    return await this.prisma.negocio.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.telefono !== undefined && { telefono: data.telefono }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      },
    });
  }

  /**
   * Actualizar configuración de agenda pública
   */
  async updateAgendaPublica(id: string, data: UpdateAgendaPublicaDto) {
    return await this.prisma.negocio.update({
      where: { id },
      data: {
        ...(data.linkPublico !== undefined && { linkPublico: data.linkPublico }),
        ...(data.agendaPublica !== undefined && { agendaPublica: data.agendaPublica }),
      },
    });
  }

  /**
   * Actualizar configuración de notificaciones y recordatorios
   */
  async updateNotificaciones(id: string, data: UpdateNotificacionesDto) {
    return await this.prisma.negocio.update({
      where: { id },
      data: {
        ...(data.notificacionesWhatsApp !== undefined && { notificacionesWhatsApp: data.notificacionesWhatsApp }),
        ...(data.notificacionesEmail !== undefined && { notificacionesEmail: data.notificacionesEmail }),
        ...(data.recordatorio1 !== undefined && { recordatorio1: data.recordatorio1 }),
        ...(data.recordatorio2 !== undefined && { recordatorio2: data.recordatorio2 }),
      },
    });
  }

  /**
   * Actualizar mensajes personalizables de WhatsApp
   */
  async updateMensajesWhatsApp(id: string, data: UpdateMensajesWhatsAppDto) {
    return await this.prisma.negocio.update({
      where: { id },
      data: {
        ...(data.mensajeRecordatorio !== undefined && { mensajeRecordatorio: data.mensajeRecordatorio }),
        ...(data.mensajeReagendamiento !== undefined && { mensajeReagendamiento: data.mensajeReagendamiento }),
      },
    });
  }

  /**
   * Generar y asignar link público único
   */
  async generarLinkPublico(id: string, linkBase: string): Promise<string> {
    let linkPublico = linkBase;
    let contador = 1;
    let existe = await this.findByLinkPublico(linkPublico);

    // Si ya existe, agregar sufijo numérico
    while (existe && existe.id !== id) {
      linkPublico = `${linkBase}-${contador}`;
      existe = await this.findByLinkPublico(linkPublico);
      contador++;
    }

    await this.prisma.negocio.update({
      where: { id },
      data: { linkPublico },
    });

    return linkPublico;
  }
}
