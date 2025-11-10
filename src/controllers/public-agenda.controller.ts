// src/controllers/public-agenda.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { PublicAgendaService } from '../services/public-agenda.service';
import {
  CreateCitaPublicaDto,
  DisponibilidadPublicaDto,
} from '../models/public-agenda.model';

/**
 * Controlador para rutas públicas de agenda
 * NO requiere autenticación
 */
export class PublicAgendaController {
  constructor(private service: PublicAgendaService) {}

  /**
   * GET /public/agenda/:linkPublico
   * Obtener información pública del negocio
   */
  obtenerNegocio = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { linkPublico } = request.params as { linkPublico: string };

      const negocio = await this.service.obtenerNegocioPublico(linkPublico);

      return reply.status(200).send({
        success: true,
        data: negocio,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Negocio no encontrado',
      });
    }
  };

  /**
   * GET /public/agenda/:linkPublico/sucursales
   * Obtener sucursales activas del negocio
   */
  obtenerSucursales = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { linkPublico } = request.params as { linkPublico: string };

      const sucursales = await this.service.obtenerSucursalesPublicas(linkPublico);

      return reply.status(200).send({
        success: true,
        data: sucursales,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Error al obtener sucursales',
      });
    }
  };

  /**
   * GET /public/agenda/:linkPublico/servicios
   * Obtener servicios activos del negocio
   */
  obtenerServicios = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { linkPublico } = request.params as { linkPublico: string };

      const servicios = await this.service.obtenerServiciosPublicos(linkPublico);

      return reply.status(200).send({
        success: true,
        data: servicios,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Error al obtener servicios',
      });
    }
  };

  /**
   * GET /public/agenda/:linkPublico/empleados/:sucursalId
   * Obtener empleados activos de una sucursal
   */
  obtenerEmpleados = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { linkPublico, sucursalId } = request.params as {
        linkPublico: string;
        sucursalId: string;
      };

      const empleados = await this.service.obtenerEmpleadosPublicos(
        linkPublico,
        sucursalId
      );

      return reply.status(200).send({
        success: true,
        data: empleados,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Error al obtener empleados',
      });
    }
  };

  /**
   * POST /public/agenda/:linkPublico/disponibilidad
   * Obtener horarios disponibles para una fecha/servicio/empleado
   */
  obtenerDisponibilidad = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { linkPublico } = request.params as { linkPublico: string };
      const dto = request.body as DisponibilidadPublicaDto;

      const horarios = await this.service.obtenerDisponibilidadPublica(
        linkPublico,
        dto
      );

      return reply.status(200).send({
        success: true,
        data: horarios,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener disponibilidad',
      });
    }
  };

  /**
   * POST /public/agenda/:linkPublico/citas
   * Crear una cita pública (sin autenticación)
   */
  crearCita = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { linkPublico } = request.params as { linkPublico: string };
      const dto = request.body as CreateCitaPublicaDto;

      console.log('🌐 CONTROLLER - Creando cita pública:', {
        linkPublico,
        cliente: dto.clienteNombre,
        fecha: dto.fecha,
        hora: dto.horaInicio,
      });

      const cita = await this.service.crearCitaPublica(linkPublico, dto);

      return reply.status(201).send({
        success: true,
        data: cita,
        message: 'Cita creada exitosamente. Recibirás una confirmación pronto.',
      });
    } catch (error: any) {
      console.error('❌ CONTROLLER - Error al crear cita pública:', error.message);
      
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear la cita',
      });
    }
  };

  /**
   * GET /public/agenda/:linkPublico/cliente/:cedula
   * Buscar cliente por cédula
   */
  buscarClientePorCedula = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { linkPublico, cedula } = request.params as { linkPublico: string; cedula: string };

      const resultado = await this.service.buscarClientePorCedula(linkPublico, cedula);

      return reply.status(200).send({
        success: true,
        data: resultado,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al buscar cliente',
      });
    }
  };
}
