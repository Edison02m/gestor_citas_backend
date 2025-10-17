import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as string;

export interface JwtPayload {
  userId: string;
  email: string;
  rol: string;
  negocioId?: string; // Solo para ADMIN_NEGOCIO
}

export class JwtUtil {
  /**
   * Genera un token JWT
   */
  static generate(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: JWT_EXPIRES_IN as any
    };
    return jwt.sign(payload, JWT_SECRET, options);
  }

  /**
   * Verifica y decodifica un token JWT
   */
  static verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expirado');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Token inválido');
      }
      throw new Error('Error al verificar token');
    }
  }

  /**
   * Decodifica un token sin verificar (útil para debugging)
   */
  static decode(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extrae el token del header Authorization
   */
  static extractFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

// Función helper para generar token con formato simple
export const generateToken = (payload: { id: string; email: string; rol: string }) => {
  return JwtUtil.generate({
    userId: payload.id,
    email: payload.email,
    rol: payload.rol,
  });
};

// Función helper para verificar token
export const verifyToken = (token: string) => JwtUtil.verify(token);

