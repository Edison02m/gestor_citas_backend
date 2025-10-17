import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export class PasswordUtil {
  /**
   * Hashea una contraseña usando bcrypt
   */
  static async hash(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compara una contraseña en texto plano con su hash
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Valida que la contraseña cumpla con los requisitos mínimos
   */
  static validate(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 6) {
      return {
        valid: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      };
    }

    // Puedes agregar más validaciones aquí
    // - Al menos una mayúscula
    // - Al menos un número
    // - Al menos un carácter especial
    
    return { valid: true };
  }
}

// Funciones helper para compatibilidad
export const hashPassword = (password: string) => PasswordUtil.hash(password);
export const comparePassword = (password: string, hash: string) => PasswordUtil.compare(password, hash);
export const validatePassword = (password: string) => PasswordUtil.validate(password);
