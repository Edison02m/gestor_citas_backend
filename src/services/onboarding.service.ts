// src/services/onboarding.service.ts

import { PrismaClient } from '@prisma/client';
import { 
  OnboardingStatusResponse,
  OnboardingSucursalDto,
  OnboardingServicioDto,
  OnboardingEmpleadoDto,
  OnboardingCompleteDto
} from '../models/onboarding.model';

export class OnboardingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Obtener estado del onboarding
   */
  async getStatus(negocioId: string): Promise<OnboardingStatusResponse> {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      include: {
        usuario: { select: { primerLogin: true } },
        sucursales: true,
        servicios: true,
        empleados: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    const tieneSucursales = negocio.sucursales.length > 0;
    const tieneServicios = negocio.servicios.length > 0;
    const tieneEmpleados = negocio.empleados.length > 0;

    // Determinar paso actual
    let pasoActual = 1;
    if (!tieneSucursales) {
      pasoActual = 2; // Falta crear sucursales
    } else if (!tieneServicios) {
      pasoActual = 3; // Falta crear servicios
    } else {
      // Ya tiene sucursales y servicios, puede completar o agregar empleados
      pasoActual = tieneEmpleados ? 5 : 4; // Si tiene empleados ya completó, sino puede agregar o saltar
    }

    // Si ya completó el onboarding, siempre mostrar paso 5
    const yaCompleto = !negocio.usuario?.primerLogin;
    if (yaCompleto) {
      pasoActual = 5;
    }

    return {
      completado: yaCompleto,
      pasoActual,
      pasos: [
        {
          paso: 1,
          nombre: 'Información del Negocio',
          completado: true, // Ya se hizo en el registro
          opcional: false,
        },
        {
          paso: 2,
          nombre: 'Sucursales',
          completado: tieneSucursales,
          opcional: false,
        },
        {
          paso: 3,
          nombre: 'Servicios',
          completado: tieneServicios,
          opcional: false,
        },
        {
          paso: 4,
          nombre: 'Empleados',
          completado: tieneEmpleados,
          opcional: true, // OPCIONAL
        },
      ],
      negocio: {
        tieneSucursales,
        tieneServicios,
        tieneEmpleados,
      },
    };
  }

  /**
   * PASO 2: Crear sucursal con horarios
   */
  async crearSucursal(negocioId: string, dto: OnboardingSucursalDto) {
    // Validar que el negocio existe
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Validar que se envíen horarios para todos los días (0-6)
    if (dto.horarios.length !== 7) {
      throw new Error('Debes especificar horarios para los 7 días de la semana');
    }

    // Validar que no haya días duplicados
    const diasUnicos = new Set(dto.horarios.map(h => h.diaSemana));
    if (diasUnicos.size !== 7) {
      throw new Error('No puedes tener días duplicados en los horarios');
    }

    // Validar que todos los días sean válidos (0-6)
    const diasValidos = dto.horarios.every(h => h.diaSemana >= 0 && h.diaSemana <= 6);
    if (!diasValidos) {
      throw new Error('Los días de la semana deben estar entre 0 (Domingo) y 6 (Sábado)');
    }

    // Crear sucursal con horarios en una transacción
    return await this.prisma.$transaction(async (tx) => {
      const sucursal = await tx.sucursal.create({
        data: {
          nombre: dto.nombre,
          direccion: dto.direccion,
          ciudad: dto.ciudad,
          provincia: dto.provincia,
          telefono: dto.telefono,
          email: dto.email,
          negocioId,
        },
      });

      // Crear horarios
      await tx.horarioSucursal.createMany({
        data: dto.horarios.map((h) => ({
          sucursalId: sucursal.id,
          diaSemana: h.diaSemana,
          abierto: h.abierto,
          horaApertura: h.abierto ? h.horaApertura : null,
          horaCierre: h.abierto ? h.horaCierre : null,
        })),
      });

      return sucursal;
    });
  }

  /**
   * PASO 3: Crear servicio con extras y asignar a sucursales
   */
  async crearServicio(negocioId: string, dto: OnboardingServicioDto) {
    // Validar que el negocio tiene sucursales
    const sucursales = await this.prisma.sucursal.findMany({
      where: { negocioId },
    });

    if (sucursales.length === 0) {
      throw new Error('Debes crear al menos una sucursal antes de agregar servicios');
    }

    // Validar que se envíen sucursales
    if (!dto.sucursalIds || dto.sucursalIds.length === 0) {
      throw new Error('Debes asignar el servicio a al menos una sucursal');
    }

    // Validar que las sucursales seleccionadas existen y pertenecen al negocio
    const sucursalesValidas = sucursales.filter((s) =>
      dto.sucursalIds.includes(s.id)
    );

    if (sucursalesValidas.length !== dto.sucursalIds.length) {
      throw new Error('Una o más sucursales especificadas no existen o no pertenecen a tu negocio');
    }

    // Validar precio y duración
    if (dto.precio <= 0) {
      throw new Error('El precio debe ser mayor a 0');
    }

    if (dto.duracion <= 0) {
      throw new Error('La duración debe ser mayor a 0 minutos');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Crear servicio
      const servicio = await tx.servicio.create({
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
          duracion: dto.duracion,
          precio: dto.precio,
          foto: dto.foto,
          negocioId,
        },
      });

      // Crear extras si hay
      if (dto.extras && dto.extras.length > 0) {
        await tx.servicioExtra.createMany({
          data: dto.extras.map((extra) => ({
            servicioId: servicio.id,
            nombre: extra.nombre,
            precio: extra.precio,
          })),
        });
      }

      // Asignar a sucursales
      await tx.servicioSucursal.createMany({
        data: dto.sucursalIds.map((sucursalId) => ({
          servicioId: servicio.id,
          sucursalId,
          disponible: true,
        })),
      });

      return servicio;
    });
  }

  /**
   * PASO 4: Crear empleado con horarios y asignar a sucursales (OPCIONAL)
   */
  async crearEmpleado(negocioId: string, dto: OnboardingEmpleadoDto) {
    // Validar que el negocio tiene sucursales
    const sucursales = await this.prisma.sucursal.findMany({
      where: { negocioId },
    });

    if (sucursales.length === 0) {
      throw new Error('Debes crear al menos una sucursal antes de agregar empleados');
    }

    // Validar que se envíen sucursales
    if (!dto.sucursalIds || dto.sucursalIds.length === 0) {
      throw new Error('Debes asignar el empleado a al menos una sucursal');
    }

    // Validar que las sucursales existen y pertenecen al negocio
    const sucursalesValidas = sucursales.filter((s) =>
      dto.sucursalIds.includes(s.id)
    );

    if (sucursalesValidas.length !== dto.sucursalIds.length) {
      throw new Error('Una o más sucursales especificadas no existen o no pertenecen a tu negocio');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Crear empleado
      const empleado = await tx.empleado.create({
        data: {
          nombre: dto.nombre,
          cargo: dto.cargo,
          telefono: dto.telefono,
          email: dto.email,
          foto: dto.foto,
          color: dto.color || '#3b82f6',
          negocioId,
        },
      });

      // Crear horarios del empleado
      if (dto.horarios && dto.horarios.length > 0) {
        await tx.horarioEmpleado.createMany({
          data: dto.horarios.map((h) => ({
            empleadoId: empleado.id,
            diaSemana: h.diaSemana,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
            tieneDescanso: h.tieneDescanso,
            descansoInicio: h.tieneDescanso ? h.descansoInicio : null,
            descansoFin: h.tieneDescanso ? h.descansoFin : null,
          })),
        });
      }

      // Asignar a sucursales
      if (dto.sucursalIds && dto.sucursalIds.length > 0) {
        await tx.empleadoSucursal.createMany({
          data: dto.sucursalIds.map((sucursalId) => ({
            empleadoId: empleado.id,
            sucursalId,
          })),
        });
      }

      return empleado;
    });
  }

  /**
   * PASO 5: Completar onboarding
   */
  async completarOnboarding(usuarioId: string, negocioId: string) {
    // Validar que tiene al menos 1 sucursal y 1 servicio
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      include: {
        usuario: { select: { primerLogin: true } },
        sucursales: true,
        servicios: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Validar que efectivamente es primer login
    if (!negocio.usuario?.primerLogin) {
      throw new Error('El onboarding ya fue completado anteriormente');
    }

    if (negocio.sucursales.length === 0) {
      throw new Error('Debes crear al menos una sucursal para completar la configuración');
    }

    if (negocio.servicios.length === 0) {
      throw new Error('Debes crear al menos un servicio para completar la configuración');
    }

    // Marcar primerLogin como false
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { primerLogin: false },
    });

    return {
      success: true,
      message: 'Configuración inicial completada exitosamente',
    };
  }

  /**
   * BATCH: Crear todo de una vez (opcional, para usuarios avanzados)
   */
  async configuracionCompleta(negocioId: string, usuarioId: string, dto: OnboardingCompleteDto) {
    // Validaciones previas
    if (!dto.sucursales || dto.sucursales.length === 0) {
      throw new Error('Debes incluir al menos una sucursal');
    }

    if (!dto.servicios || dto.servicios.length === 0) {
      throw new Error('Debes incluir al menos un servicio');
    }

    // Validar que el usuario tiene primerLogin = true
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { primerLogin: true },
    });

    if (!usuario?.primerLogin) {
      throw new Error('El onboarding ya fue completado anteriormente');
    }

    return await this.prisma.$transaction(async (tx) => {
      const sucursalesCreadas: any[] = [];
      const serviciosCreados: any[] = [];
      const empleadosCreados: any[] = [];

      // 1. Crear sucursales
      for (const sucursalDto of dto.sucursales) {
        const sucursal = await tx.sucursal.create({
          data: {
            nombre: sucursalDto.nombre,
            direccion: sucursalDto.direccion,
            ciudad: sucursalDto.ciudad,
            provincia: sucursalDto.provincia,
            telefono: sucursalDto.telefono,
            email: sucursalDto.email,
            negocioId,
          },
        });

        await tx.horarioSucursal.createMany({
          data: sucursalDto.horarios.map((h) => ({
            sucursalId: sucursal.id,
            diaSemana: h.diaSemana,
            abierto: h.abierto,
            horaApertura: h.abierto ? h.horaApertura : null,
            horaCierre: h.abierto ? h.horaCierre : null,
          })),
        });

        sucursalesCreadas.push(sucursal);
      }

      // 2. Crear servicios
      for (const servicioDto of dto.servicios) {
        const servicio = await tx.servicio.create({
          data: {
            nombre: servicioDto.nombre,
            descripcion: servicioDto.descripcion,
            duracion: servicioDto.duracion,
            precio: servicioDto.precio,
            foto: servicioDto.foto,
            negocioId,
          },
        });

        if (servicioDto.extras && servicioDto.extras.length > 0) {
          await tx.servicioExtra.createMany({
            data: servicioDto.extras.map((extra) => ({
              servicioId: servicio.id,
              nombre: extra.nombre,
              precio: extra.precio,
            })),
          });
        }

        await tx.servicioSucursal.createMany({
          data: servicioDto.sucursalIds.map((sucursalId) => ({
            servicioId: servicio.id,
            sucursalId,
            disponible: true,
          })),
        });

        serviciosCreados.push(servicio);
      }

      // 3. Crear empleados (opcional)
      if (dto.empleados && dto.empleados.length > 0) {
        for (const empleadoDto of dto.empleados) {
          const empleado = await tx.empleado.create({
            data: {
              nombre: empleadoDto.nombre,
              cargo: empleadoDto.cargo,
              telefono: empleadoDto.telefono,
              email: empleadoDto.email,
              foto: empleadoDto.foto,
              color: empleadoDto.color || '#3b82f6',
              negocioId,
            },
          });

          if (empleadoDto.horarios && empleadoDto.horarios.length > 0) {
            await tx.horarioEmpleado.createMany({
              data: empleadoDto.horarios.map((h) => ({
                empleadoId: empleado.id,
                diaSemana: h.diaSemana,
                horaInicio: h.horaInicio,
                horaFin: h.horaFin,
                tieneDescanso: h.tieneDescanso,
                descansoInicio: h.tieneDescanso ? h.descansoInicio : null,
                descansoFin: h.tieneDescanso ? h.descansoFin : null,
              })),
            });
          }

          if (empleadoDto.sucursalIds && empleadoDto.sucursalIds.length > 0) {
            await tx.empleadoSucursal.createMany({
              data: empleadoDto.sucursalIds.map((sucursalId) => ({
                empleadoId: empleado.id,
                sucursalId,
              })),
            });
          }

          empleadosCreados.push(empleado);
        }
      }

      // 4. Completar onboarding
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { primerLogin: false },
      });

      return {
        sucursales: sucursalesCreadas,
        servicios: serviciosCreados,
        empleados: empleadosCreados,
      };
    });
  }
}
