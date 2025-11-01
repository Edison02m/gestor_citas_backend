// src/services/public-agenda.service.ts

import { PrismaClient } from '@prisma/client';
import { CitaService } from './cita.service';
import {
  CreateCitaPublicaDto,
  DisponibilidadPublicaDto,
  NegocioPublicoResponse,
  SucursalPublicaResponse,
  ServicioPublicoResponse,
  EmpleadoPublicoResponse,
} from '../models/public-agenda.model';
import { CreateCitaDto, HorarioDisponible } from '../models/cita.model';

/**
 * Servicio para manejar la agenda pública de negocios
 * Permite a clientes crear citas sin autenticación
 */
export class PublicAgendaService {
  private citaService: CitaService;

  constructor(private prisma: PrismaClient) {
    this.citaService = new CitaService(prisma);
  }

  // ============================================================================
  // OBTENER INFORMACIÓN PÚBLICA DEL NEGOCIO
  // ============================================================================

  /**
   * Obtener información básica del negocio por su link público
   */
  async obtenerNegocioPublico(linkPublico: string): Promise<NegocioPublicoResponse> {
    const negocio = await this.prisma.negocio.findUnique({
      where: { linkPublico },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        logo: true,
        descripcion: true,
        agendaPublica: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    if (!negocio.agendaPublica) {
      throw new Error('La agenda pública de este negocio no está disponible');
    }

    return negocio;
  }

  /**
   * Obtener sucursales activas del negocio
   */
  async obtenerSucursalesPublicas(linkPublico: string): Promise<SucursalPublicaResponse[]> {
    const negocio = await this.validarNegocioPublico(linkPublico);

    const sucursales = await this.prisma.sucursal.findMany({
      where: {
        negocioId: negocio.id,
        estado: 'ACTIVA',
      },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        telefono: true,
        ciudad: true,
        estado: true,
        horarios: {
          select: {
            id: true,
            diaSemana: true,
            abierto: true,
            horaApertura: true,
            horaCierre: true,
            tieneDescanso: true,
            descansoInicio: true,
            descansoFin: true,
          },
          orderBy: { diaSemana: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return sucursales.map(s => ({
      ...s,
      ciudad: s.ciudad || '', // Manejar null
    }));
  }

  /**
   * Obtener servicios activos del negocio
   */
  async obtenerServiciosPublicos(linkPublico: string): Promise<ServicioPublicoResponse[]> {
    const negocio = await this.validarNegocioPublico(linkPublico);

    const servicios = await this.prisma.servicio.findMany({
      where: {
        negocioId: negocio.id,
        estado: 'ACTIVO',
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        duracion: true,
        precio: true,
        color: true,
        sucursales: {
          select: {
            sucursalId: true,
            disponible: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    return servicios.map(s => ({
      ...s,
      precio: Number(s.precio), // Convertir Decimal a number
    }));
  }

  /**
   * Obtener empleados activos de una sucursal específica
   */
  async obtenerEmpleadosPublicos(
    linkPublico: string,
    sucursalId: string
  ): Promise<EmpleadoPublicoResponse[]> {
    const negocio = await this.validarNegocioPublico(linkPublico);

    // Validar que la sucursal pertenece al negocio
    const sucursal = await this.prisma.sucursal.findFirst({
      where: {
        id: sucursalId,
        negocioId: negocio.id,
        estado: 'ACTIVA',
      },
    });

    if (!sucursal) {
      throw new Error('Sucursal no encontrada o no está activa');
    }

    // Obtener empleados que trabajan en esta sucursal
    const empleadosSucursal = await this.prisma.empleadoSucursal.findMany({
      where: {
        sucursalId,
        empleado: {
          negocioId: negocio.id,
          estado: 'ACTIVO',
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            cargo: true,
            foto: true,
          },
        },
      },
    });

    return empleadosSucursal.map((es) => es.empleado);
  }

  /**
   * Obtener disponibilidad de horarios (reutiliza lógica de CitaService)
   */
  async obtenerDisponibilidadPublica(
    linkPublico: string,
    dto: DisponibilidadPublicaDto
  ): Promise<HorarioDisponible[]> {
    const negocio = await this.validarNegocioPublico(linkPublico);

    // Reutilizar el método de disponibilidad del CitaService
    return await this.citaService.obtenerDisponibilidad(negocio.id, dto);
  }

  // ============================================================================
  // CREAR CITA PÚBLICA
  // ============================================================================

  /**
   * Crear una cita desde la agenda pública
   * Busca o crea el cliente automáticamente
   */
  async crearCitaPublica(linkPublico: string, dto: CreateCitaPublicaDto): Promise<any> {
    // Validar formato del email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!dto.clienteEmail || !emailRegex.test(dto.clienteEmail)) {
      throw new Error('El email es obligatorio y debe tener un formato válido');
    }

    const negocio = await this.validarNegocioPublico(linkPublico);

    console.log('🌐 AGENDA PÚBLICA - Creando cita:', {
      linkPublico,
      negocioId: negocio.id,
      negocioNombre: negocio.nombre,
      clienteCedula: dto.clienteCedula,
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
    });

    // IMPORTANTE: Validar suscripción activa del negocio
    await this.validarSuscripcionActiva(negocio.id);

    // 1. Buscar cliente existente por cédula
    let cliente = await this.prisma.cliente.findFirst({
      where: {
        negocioId: negocio.id,
        cedula: dto.clienteCedula,
      },
    });

    // 2. Si no existe, crear nuevo cliente
    if (!cliente) {
      console.log('👤 Cliente no existe, creando nuevo cliente:', dto.clienteNombre);
      
      cliente = await this.prisma.cliente.create({
        data: {
          nombre: dto.clienteNombre,
          cedula: dto.clienteCedula,
          telefono: dto.clienteTelefono,
          email: dto.clienteEmail,
          negocioId: negocio.id,
        },
      });

      console.log('✅ Cliente creado:', cliente.id);
    } else {
      console.log('✅ Cliente existente encontrado:', cliente.id, cliente.nombre);
      
      // Actualizar solo si los datos nuevos no están vacíos y son diferentes
      const actualizaciones: any = {};
      
      if (dto.clienteNombre && dto.clienteNombre.trim() !== '' && cliente.nombre !== dto.clienteNombre) {
        actualizaciones.nombre = dto.clienteNombre;
      }
      
      if (dto.clienteTelefono && dto.clienteTelefono.trim() !== '' && cliente.telefono !== dto.clienteTelefono) {
        actualizaciones.telefono = dto.clienteTelefono;
      }
      
      if (dto.clienteEmail && dto.clienteEmail.trim() !== '' && cliente.email !== dto.clienteEmail) {
        actualizaciones.email = dto.clienteEmail;
      }

      if (Object.keys(actualizaciones).length > 0) {
        console.log('🔄 Actualizando datos del cliente:', actualizaciones);
        
        cliente = await this.prisma.cliente.update({
          where: { id: cliente.id },
          data: actualizaciones,
        });

        console.log('✅ Cliente actualizado');
      }
    }

    // 3. Validar que el servicio pertenece al negocio
    const servicio = await this.prisma.servicio.findFirst({
      where: {
        id: dto.servicioId,
        negocioId: negocio.id,
        estado: 'ACTIVO',
      },
    });

    if (!servicio) {
      throw new Error('Servicio no encontrado o no está activo');
    }

    // 4. Validar que la sucursal pertenece al negocio
    const sucursal = await this.prisma.sucursal.findFirst({
      where: {
        id: dto.sucursalId,
        negocioId: negocio.id,
        estado: 'ACTIVA',
      },
    });

    if (!sucursal) {
      throw new Error('Sucursal no encontrada o no está activa');
    }

    // 5. Validar empleado si se especifica
    if (dto.empleadoId) {
      const empleado = await this.prisma.empleado.findFirst({
        where: {
          id: dto.empleadoId,
          negocioId: negocio.id,
          estado: 'ACTIVO',
        },
        include: {
          sucursales: {
            where: {
              sucursalId: dto.sucursalId,
            },
          },
        },
      });

      if (!empleado) {
        throw new Error('Empleado no encontrado o no está activo');
      }

      // Validar que el empleado trabaja en la sucursal especificada
      if (empleado.sucursales.length === 0) {
        throw new Error('El empleado no trabaja en la sucursal seleccionada');
      }
    }

    // 6. Preparar DTO para crear cita (reutilizar CitaService)
    const citaDto: CreateCitaDto = {
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      clienteId: cliente.id,
      servicioId: dto.servicioId,
      empleadoId: dto.empleadoId,
      sucursalId: dto.sucursalId,
      notas: dto.notas,
      canalOrigen: 'WEB_PUBLICA' as any, // Force type - el enum ya incluye WEB_PUBLICA
    };

    console.log('📋 DTO preparado para crear cita:', citaDto);

    // 7. Reutilizar toda la lógica de validación de CitaService
    // Esto incluye: validación de horarios, bloqueos, conflictos, capacidad, etc.
    const cita = await this.citaService.crearCita(
      negocio.id,
      citaDto,
      'SISTEMA_PUBLICO' // Creado por el sistema público
    );

    console.log('✅ Cita creada exitosamente desde agenda pública:', cita.id);

    return cita;
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Validar que el negocio existe y tiene agenda pública habilitada
   */
  private async validarNegocioPublico(linkPublico: string) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { linkPublico },
      select: {
        id: true,
        nombre: true,
        agendaPublica: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    if (!negocio.agendaPublica) {
      throw new Error('La agenda pública de este negocio no está disponible');
    }

    return negocio;
  }

  /**
   * Validar que el negocio tiene suscripción activa
   */
  private async validarSuscripcionActiva(negocioId: string) {
    const negocio = await this.prisma.negocio.findUnique({
      where: { id: negocioId },
      select: {
        estadoSuscripcion: true,
        bloqueado: true,
        motivoBloqueo: true,
      },
    });

    if (!negocio) {
      throw new Error('Negocio no encontrado');
    }

    // Validar que el negocio no esté bloqueado
    if (negocio.bloqueado) {
      throw new Error(
        `Este negocio está temporalmente bloqueado${
          negocio.motivoBloqueo ? `: ${negocio.motivoBloqueo}` : ''
        }. Por favor, contacta directamente con el negocio.`
      );
    }

    // Validar que tenga suscripción activa
    if (negocio.estadoSuscripcion !== 'ACTIVA') {
      throw new Error(
        'Este negocio no tiene una suscripción activa en este momento. Por favor, contacta directamente con el negocio para agendar tu cita.'
      );
    }
  }

  /**
   * Buscar cliente por cédula
   */
  async buscarClientePorCedula(linkPublico: string, cedula: string) {
    // Obtener el negocio
    const negocio = await this.validarNegocioPublico(linkPublico);

    // Normalizar la cédula (quitar espacios y convertir a mayúsculas para comparación)
    const cedulaNormalizada = cedula.trim().replace(/\s+/g, '');

    // Primero intentar búsqueda exacta
    let cliente = await this.prisma.cliente.findFirst({
      where: {
        cedula: cedula.trim(),
        negocioId: negocio.id,
      },
      select: {
        id: true,
        cedula: true,
        nombre: true,
        telefono: true,
        email: true,
      },
    });

    // Si no encuentra con búsqueda exacta, intentar búsqueda flexible
    if (!cliente) {
      // Obtener todos los clientes del negocio y buscar manualmente
      const todosClientes = await this.prisma.cliente.findMany({
        where: {
          negocioId: negocio.id,
        },
        select: {
          id: true,
          cedula: true,
          nombre: true,
          telefono: true,
          email: true,
        },
      });

      // Buscar cliente cuya cédula normalizada coincida
      cliente = todosClientes.find(c => 
        c.cedula.trim().replace(/\s+/g, '') === cedulaNormalizada
      ) || null;
    }

    if (cliente) {
      return {
        existe: true,
        cliente,
      };
    }

    return {
      existe: false,
    };
  }
}
