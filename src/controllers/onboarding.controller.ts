// src/controllers/onboarding.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { OnboardingService } from '../services/onboarding.service';
import {
  OnboardingSucursalDto,
  OnboardingServicioDto,
  OnboardingEmpleadoDto,
  OnboardingCompleteDto,
} from '../models/onboarding.model';

export class OnboardingController {
  constructor(private service: OnboardingService) {}

  /**
   * GET /api/onboarding/status
   * Obtener estado del onboarding
   */
  getStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId; // Asume que viene del middleware

      const status = await this.service.getStatus(negocioId);

      return reply.status(200).send({
        success: true,
        data: status,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al obtener estado del onboarding',
      });
    }
  };

  /**
   * POST /api/onboarding/sucursales
   * Crear sucursal (Paso 2)
   */
  crearSucursal = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as OnboardingSucursalDto;

      const sucursal = await this.service.crearSucursal(negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: sucursal,
        message: 'Sucursal creada exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear sucursal',
      });
    }
  };

  /**
   * POST /api/onboarding/servicios
   * Crear servicio (Paso 3)
   */
  crearServicio = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as OnboardingServicioDto;

      const servicio = await this.service.crearServicio(negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: servicio,
        message: 'Servicio creado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear servicio',
      });
    }
  };

  /**
   * POST /api/onboarding/empleados
   * Crear empleado (Paso 4 - OPCIONAL)
   */
  crearEmpleado = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const dto = request.body as OnboardingEmpleadoDto;

      const empleado = await this.service.crearEmpleado(negocioId, dto);

      return reply.status(201).send({
        success: true,
        data: empleado,
        message: 'Empleado creado exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al crear empleado',
      });
    }
  };

  /**
   * POST /api/onboarding/completar
   * Completar onboarding (Paso 5)
   */
  completar = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const usuarioId = user.userId;

      const result = await this.service.completarOnboarding(usuarioId, negocioId);

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al completar onboarding',
      });
    }
  };

  /**
   * POST /api/onboarding/completo
   * Configuración completa en un solo paso (BATCH)
   */
  configuracionCompleta = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const negocioId = user.negocioId;
      const usuarioId = user.userId;
      const dto = request.body as OnboardingCompleteDto;

      const result = await this.service.configuracionCompleta(negocioId, usuarioId, dto);

      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Configuración completada exitosamente',
      });
    } catch (error: any) {
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al completar configuración',
      });
    }
  };
}
