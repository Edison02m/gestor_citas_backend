import { FastifyRequest, FastifyReply } from 'fastify';
import { SuscripcionService } from '../services/suscripcion.service';
import { ActivarCodigoDto } from '../models/suscripcion.model';

export class SuscripcionController {
  constructor(private readonly service: SuscripcionService) {}

  activarCodigo = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const dto = request.body as ActivarCodigoDto;

      if (!dto.codigo) {
        return reply.status(400).send({
          success: false,
          message: 'El código es requerido',
        });
      }

      const response = await this.service.activarCodigo(userId, dto);

      return reply.status(200).send(response);
    } catch (error: any) {
      console.error('Error al activar código:', error);
      return reply.status(400).send({
        success: false,
        message: error.message || 'Error al activar código',
      });
    }
  };
}
