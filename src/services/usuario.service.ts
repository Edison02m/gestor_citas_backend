import { UsuarioRepository } from '../repositories/usuario.repository';
import { NegocioRepository } from '../repositories/negocio.repository';
import { PrismaClient, PlanSuscripcion } from '@prisma/client';
import { hashPassword } from '../utils/password.util';
import {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioResponse,
} from '../models/usuario.model';
import usoRecursosService from './uso-recursos.service';

export class UsuarioService {
  constructor(
    private usuarioRepository: UsuarioRepository,
    private negocioRepository: NegocioRepository,
    private prisma: PrismaClient
  ) {}

  async register(dto: CreateUsuarioDto): Promise<UsuarioResponse> {
    const emailExists = await this.usuarioRepository.emailExists(dto.email);
    if (emailExists) {
      throw new Error('El email ya está registrado');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new Error('Email inválido');
    }

    if (dto.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres');
    }

    if (!dto.nombre || dto.nombre.trim().length < 2) {
      throw new Error('El nombre del usuario debe tener al menos 2 caracteres');
    }

    if (!dto.nombreNegocio || dto.nombreNegocio.trim().length < 2) {
      throw new Error('El nombre del negocio debe tener al menos 2 caracteres');
    }

    if (!dto.telefono || dto.telefono.trim().length < 7) {
      throw new Error('El teléfono debe tener al menos 7 caracteres');
    }

    const hashedPassword = await hashPassword(dto.password);

    try {
      // Crear usuario, negocio y suscripción de prueba en una transacción
      const resultado = await this.prisma.$transaction(async (tx) => {
        // 1. Crear el usuario
        const usuario = await tx.usuario.create({
          data: {
            nombre: dto.nombre.trim(),
            email: dto.email,
            password: hashedPassword,
          },
        });

        // 2. Obtener configuración del plan GRATIS desde la base de datos
        const configPlanGratis = await tx.configuracionPlanes.findUnique({
          where: { plan: PlanSuscripcion.GRATIS },
        });

        if (!configPlanGratis) {
          throw new Error('Configuración del plan GRATIS no encontrada');
        }

        // 2.1 Crear el negocio con límites del plan GRATIS
        const negocio = await tx.negocio.create({
          data: {
            nombre: dto.nombreNegocio.trim(),
            telefono: dto.telefono.trim(),
            logo: dto.logo,
            descripcion: dto.descripcion?.trim(),
            usuarioId: usuario.id,
            estadoSuscripcion: 'ACTIVA',
            codigoAplicado: true,
            // Asignar límites del plan GRATIS directamente
            limiteSucursales: configPlanGratis.limiteSucursales,
            limiteEmpleados: configPlanGratis.limiteEmpleados,
            limiteServicios: configPlanGratis.limiteServicios,
            limiteClientes: configPlanGratis.limiteClientes,
            limiteCitasMes: configPlanGratis.limiteCitasMes,
            limiteWhatsAppMes: configPlanGratis.limiteWhatsAppMes,
            limiteEmailMes: configPlanGratis.limiteEmailMes,
            reportesAvanzados: configPlanGratis.reportesAvanzados,
          },
        });

        // 3. Crear código de suscripción de prueba automático
        const codigoPrueba = await tx.codigoSuscripcion.create({
          data: {
            codigo: `PRUEBA-${Date.now()}-${usuario.id.substring(0, 8)}`,
            plan: PlanSuscripcion.GRATIS, // Cambiar de PRUEBA a GRATIS
            duracionDias: 14, // 14 días de prueba gratuita
            descripcion: 'Período de prueba gratuito de 14 días',
            precio: 0,
            usado: true,
            fechaUso: new Date(),
            vecesUsado: 1,
            motivoCreacion: 'Registro automático con período de prueba',
            notas: `Generado automáticamente para ${dto.email}`,
          },
        });

        // 4. Crear la suscripción activa
        const fechaActivacion = new Date();
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 14); // 14 días desde hoy

        const suscripcion = await tx.suscripcion.create({
          data: {
            negocioId: negocio.id,
            codigoId: codigoPrueba.id,
            fechaActivacion,
            fechaVencimiento,
            activa: true,
            renovacionAuto: false,
          },
        });

        // 5. Registrar en historial - REGISTRO
        await tx.historialSuscripcion.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'REGISTRO',
            descripcion: `Nuevo negocio registrado: ${dto.nombreNegocio}. Usuario: ${dto.email}`,
            codigoUsado: null,
            realizadoPor: usuario.id,
            metadata: {
              nombreNegocio: dto.nombreNegocio,
              emailUsuario: dto.email,
              nombreUsuario: dto.nombre,
            },
          },
        });

        // 6. Registrar en historial - ACTIVACION AUTOMÁTICA
        await tx.historialSuscripcion.create({
          data: {
            suscripcionId: suscripcion.id,
            accion: 'ACTIVACION_CODIGO',
            descripcion: `Período de prueba de 14 días activado automáticamente. Vence el ${fechaVencimiento.toLocaleDateString('es-ES', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}`,
            codigoUsado: codigoPrueba.codigo,
            realizadoPor: usuario.id,
            metadata: {
              tipoActivacion: 'automatica',
              duracionDias: 30,
              emailUsuario: dto.email,
              fechaInicio: fechaActivacion.toISOString(),
              fechaFin: fechaVencimiento.toISOString(),
            },
          },
        });

        // 7. NO cambiar primerLogin aquí - se cambiará cuando complete el onboarding
        // El usuario tiene suscripción activa pero aún debe configurar su negocio
        
        return { usuario, negocioId: negocio.id };
      });

      // Crear el registro de UsoRecursos para el primer ciclo
      // Esto asegura que el dashboard pueda cargar los datos de uso desde el primer día
      try {
        await usoRecursosService.obtenerUsoActual(resultado.negocioId);
      } catch (error) {
        console.warn('No se pudo crear el registro de UsoRecursos inicial:', error);
        // No lanzar error, solo advertir - el registro se creará al primer uso
      }

      // Obtener el usuario completo con toda la información
      const usuarioCompleto = await this.usuarioRepository.findById(resultado.usuario.id);

      if (!usuarioCompleto || !usuarioCompleto.negocio) {
        throw new Error('Error al crear usuario y negocio');
      }

      return this.toResponse(usuarioCompleto);
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      throw new Error(error.message || 'Error al registrar usuario y negocio');
    }
  }

  async getProfile(userId: string): Promise<UsuarioResponse> {
    const usuario = await this.usuarioRepository.findById(userId);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    return this.toResponse(usuario);
  }

  async updateProfile(userId: string, dto: UpdateUsuarioDto): Promise<UsuarioResponse> {
    const usuario = await this.usuarioRepository.findById(userId);

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    if (dto.email && dto.email !== usuario.email) {
      const emailExists = await this.usuarioRepository.emailExists(dto.email);
      if (emailExists) {
        throw new Error('El email ya está registrado');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(dto.email)) {
        throw new Error('Email inválido');
      }
    }

    const updateData: any = {};

    if (dto.nombre) {
      updateData.nombre = dto.nombre;
    }

    if (dto.email) {
      updateData.email = dto.email;
    }

    if (dto.password) {
      if (dto.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }
      updateData.password = await hashPassword(dto.password);
    }

    await this.usuarioRepository.update(userId, updateData);

    if (dto.nombreNegocio || dto.telefono) {
      if (usuario.negocio) {
        await this.negocioRepository.update(usuario.negocio.id, {
          nombre: dto.nombreNegocio,
          telefono: dto.telefono,
        });
      }
    }

    const usuarioCompleto = await this.usuarioRepository.findById(userId);

    if (!usuarioCompleto) {
      throw new Error('Error al actualizar usuario');
    }

    return this.toResponse(usuarioCompleto);
  }

  private toResponse(usuario: any): UsuarioResponse {
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      primerLogin: usuario.primerLogin,
      activo: usuario.activo,
      negocio: usuario.negocio
        ? {
            id: usuario.negocio.id,
            nombre: usuario.negocio.nombre,
            telefono: usuario.negocio.telefono,
            logo: usuario.negocio.logo,
            descripcion: usuario.negocio.descripcion,
            estadoSuscripcion: usuario.negocio.estadoSuscripcion,
            // 🎯 Plan pendiente (sistema de cola)
            planPendiente: usuario.negocio.suscripcion?.planPendiente || null,
            fechaInicioPendiente: usuario.negocio.suscripcion?.fechaInicioPendiente || null,
          }
        : undefined,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    };
  }
}
