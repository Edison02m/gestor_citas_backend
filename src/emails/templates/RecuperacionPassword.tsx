import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface RecuperacionPasswordProps {
  nombreUsuario: string;
  resetUrl: string;
  expirationMinutes: number;
}

export const RecuperacionPassword: React.FC<RecuperacionPasswordProps> = ({
  nombreUsuario,
  resetUrl,
  expirationMinutes,
}) => {
  const primerNombre = nombreUsuario.split(' ')[0];

  return (
    <Html lang="es">
      <Head />
      <Preview>Recuperación de contraseña - CitaYA</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header con marca */}
          <Section style={header}>
            <Text style={brandName}>CitaYA</Text>
            <Text style={headerSubtitle}>Recuperación de Contraseña</Text>
          </Section>

          {/* Saludo */}
          <Section style={greetingSection}>
            <Text style={greeting}>Hola {primerNombre},</Text>
            <Text style={message}>
              Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. 
              Si no solicitaste este cambio, puedes ignorar este correo.
            </Text>
          </Section>

          {/* Card principal */}
          <Section style={contentWrapper}>
            <Section style={mainCard}>
              {/* Icono de seguridad */}
              <Section style={iconSection}>
                <Text style={icon}>🔐</Text>
              </Section>

              {/* Instrucciones */}
              <Section style={instructionsBlock}>
                <Text style={instructionTitle}>Restablecer Contraseña</Text>
                <Text style={instructionText}>
                  Para restablecer tu contraseña, haz clic en el botón de abajo. 
                  Este enlace es válido por <strong>{expirationMinutes} minutos</strong>.
                </Text>
              </Section>

              {/* Botón de acción */}
              <Section style={buttonSection}>
                <Button href={resetUrl} style={primaryButton}>
                  Restablecer Contraseña
                </Button>
              </Section>

              {/* Enlace alternativo */}
              <Section style={linkSection}>
                <Text style={linkText}>
                  Si el botón no funciona, copia y pega este enlace en tu navegador:
                </Text>
                <Text style={linkUrl}>{resetUrl}</Text>
              </Section>
            </Section>

            {/* Advertencia de seguridad */}
            <Section style={warningSection}>
              <Text style={warningTitle}>⚠️ Nota de Seguridad</Text>
              <Text style={warningText}>
                • Este enlace expirará en {expirationMinutes} minutos
              </Text>
              <Text style={warningText}>
                • Si no solicitaste este cambio, tu cuenta sigue siendo segura
              </Text>
              <Text style={warningText}>
                • Nunca compartas este enlace con nadie
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              Si tienes problemas o no solicitaste este cambio, contacta a nuestro equipo de soporte.
            </Text>
            <Text style={footerBrand}>CitaYA</Text>
            <Text style={copyright}>
              © {new Date().getFullYear()} CitaYA. Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default RecuperacionPassword;

// ============================================
// ESTILOS
// ============================================

const main = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif',
  padding: '40px 20px',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden',
  border: '1px solid #e5e7eb',
};

const contentWrapper = {
  maxWidth: '512px',
  margin: '0 auto',
  padding: '0 32px',
};

// Header
const header = {
  padding: '32px 32px 24px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#ffffff',
};

const brandName = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#111827',
  margin: '0 0 4px',
  lineHeight: '1.2',
};

const headerSubtitle = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#6b7280',
  margin: '0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

// Saludo
const greetingSection = {
  padding: '32px 32px 24px',
};

const greeting = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 16px',
  lineHeight: '1.4',
};

const message = {
  fontSize: '15px',
  color: '#4b5563',
  margin: '0',
  lineHeight: '1.6',
};

// Card principal
const mainCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '32px',
  marginBottom: '24px',
  border: '1px solid #e5e7eb',
};

const iconSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const icon = {
  fontSize: '48px',
  margin: '0',
  lineHeight: '1',
};

// Instrucciones
const instructionsBlock = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const instructionTitle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 12px',
  lineHeight: '1.3',
};

const instructionText = {
  fontSize: '15px',
  color: '#4b5563',
  margin: '0',
  lineHeight: '1.6',
};

// Botón
const buttonSection = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const primaryButton = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  lineHeight: '1.4',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
};

// Enlace alternativo
const linkSection = {
  marginTop: '24px',
  padding: '16px',
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
};

const linkText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 8px',
  lineHeight: '1.5',
};

const linkUrl = {
  fontSize: '12px',
  color: '#2563eb',
  margin: '0',
  lineHeight: '1.5',
  wordBreak: 'break-all' as const,
};

// Sección de advertencia
const warningSection = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid #fbbf24',
};

const warningTitle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#92400e',
  margin: '0 0 12px',
  lineHeight: '1.4',
};

const warningText = {
  fontSize: '13px',
  color: '#92400e',
  margin: '0 0 6px',
  lineHeight: '1.5',
};

// Footer
const footer = {
  padding: '32px',
};

const footerDivider = {
  borderColor: '#e5e7eb',
  margin: '0 0 24px',
};

const footerText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0 0 16px',
  lineHeight: '1.6',
  textAlign: 'center' as const,
};

const footerBrand = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 8px',
  textAlign: 'center' as const,
};

const copyright = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
  textAlign: 'center' as const,
};
