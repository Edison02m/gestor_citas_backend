import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Button,
  Hr,
} from '@react-email/components';

interface CitaConfirmacionProps {
  nombreCliente: string;
  nombreNegocio: string;
  nombreServicio: string;
  nombreEmpleado: string;
  fecha: string;
  hora: string;
  nombreSucursal: string;
  direccionSucursal?: string;
  telefonoSucursal?: string;
  googleMapsUrl?: string;
}

export const CitaConfirmacion: React.FC<CitaConfirmacionProps> = ({
  nombreCliente,
  nombreNegocio,
  nombreServicio,
  nombreEmpleado,
  fecha,
  hora,
  nombreSucursal,
  direccionSucursal,
  telefonoSucursal,
  googleMapsUrl,
}) => {
  const primerNombre = nombreCliente.split(' ')[0];

  return (
    <Html lang="es">
      <Head />
      <Preview>Confirmación de cita - {fecha}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header con marca */}
          <Section style={header}>
            <Text style={brandName}>{nombreNegocio}</Text>
            <Text style={headerSubtitle}>Confirmación de Cita</Text>
          </Section>

          {/* Saludo */}
          <Section style={greetingSection}>
            <Text style={greeting}>Hola {primerNombre},</Text>
            <Text style={message}>
              Tu cita ha sido confirmada exitosamente. A continuación encontrarás los detalles de tu reserva.
            </Text>
          </Section>

          {/* Card principal - Información de la cita */}
          <Section style={contentWrapper}>
            <Section style={mainCard}>
              {/* Fecha y Hora destacadas */}
              <Section style={dateTimeBlock}>
                <Row>
                  <Column style={dateColumn}>
                    <Text style={label}>FECHA</Text>
                    <Text style={value}>{fecha}</Text>
                  </Column>
                  <Column style={verticalDivider}>
                    <div style={dividerLine}></div>
                  </Column>
                  <Column style={timeColumn}>
                    <Text style={label}>HORA</Text>
                    <Text style={value}>{hora}</Text>
                  </Column>
                </Row>
              </Section>

              <Hr style={horizontalDivider} />

              {/* Detalles del servicio */}
              <Section style={detailsBlock}>
                <Row style={detailRow}>
                  <Column style={labelColumn}>
                    <Text style={detailLabel}>Servicio</Text>
                  </Column>
                  <Column>
                    <Text style={detailValue}>{nombreServicio}</Text>
                  </Column>
                </Row>

                <Row style={detailRow}>
                  <Column style={labelColumn}>
                    <Text style={detailLabel}>Profesional</Text>
                  </Column>
                  <Column>
                    <Text style={detailValue}>{nombreEmpleado}</Text>
                  </Column>
                </Row>

                <Row style={detailRow}>
                  <Column style={labelColumn}>
                    <Text style={detailLabel}>Sucursal</Text>
                  </Column>
                  <Column>
                    <Text style={detailValue}>{nombreSucursal}</Text>
                    {direccionSucursal && (
                      <Text style={detailSecondary}>{direccionSucursal}</Text>
                    )}
                    {telefonoSucursal && (
                      <Text style={detailSecondary}>Tel: {telefonoSucursal}</Text>
                    )}
                  </Column>
                </Row>
              </Section>
            </Section>

            {/* Botón de Google Maps */}
            {googleMapsUrl && (
              <Section style={buttonSection}>
                <Button href={googleMapsUrl} style={primaryButton}>
                  Abrir en Google Maps
                </Button>
              </Section>
            )}

            {/* Información adicional */}
            <Section style={infoSection}>
              <Text style={infoText}>
                Te recomendamos llegar 5-10 minutos antes de tu cita programada.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerDivider} />
            <Text style={footerText}>
              Si necesitas cancelar o reagendar tu cita, por favor contáctanos con anticipación.
            </Text>
            <Text style={footerBrand}>{nombreNegocio}</Text>
            <Text style={copyright}>
              © {new Date().getFullYear()} {nombreNegocio}. Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default CitaConfirmacion;

// ============================================
// ESTILOS PROFESIONALES - ESTILO CORPORATIVO
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
  letterSpacing: '0.05em',
};

// Greeting
const greetingSection = {
  padding: '32px 32px 24px',
};

const greeting = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 12px',
  lineHeight: '1.3',
};

const message = {
  fontSize: '15px',
  color: '#4b5563',
  margin: '0',
  lineHeight: '1.6',
};

// Main card
const mainCard = {
  margin: '0 0 24px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden',
  backgroundColor: '#ffffff',
};

// Date & Time block
const dateTimeBlock = {
  padding: '24px',
  backgroundColor: '#f9fafb',
};

const dateColumn = {
  width: '50%',
  paddingRight: '16px',
};

const verticalDivider = {
  width: '1px',
  padding: '0',
};

const dividerLine = {
  width: '1px',
  height: '100%',
  backgroundColor: '#e5e7eb',
  margin: '0 auto',
};

const timeColumn = {
  width: '50%',
  paddingLeft: '16px',
};

const label = {
  fontSize: '11px',
  fontWeight: '600',
  color: '#6b7280',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const value = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
  lineHeight: '1.4',
};

const horizontalDivider = {
  borderTop: '1px solid #e5e7eb',
  margin: '0',
};

// Details block
const detailsBlock = {
  padding: '24px',
};

const detailRow = {
  marginBottom: '16px',
};

const labelColumn = {
  width: '120px',
  verticalAlign: 'top' as const,
  paddingRight: '16px',
};

const detailLabel = {
  fontSize: '13px',
  fontWeight: '500',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.5',
};

const detailValue = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827',
  margin: '0',
  lineHeight: '1.5',
};

const detailSecondary = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '4px 0 0',
  lineHeight: '1.5',
};

// Button
const buttonSection = {
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const primaryButton = {
  backgroundColor: '#0490C8',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  lineHeight: '1.5',
  border: 'none',
};

// Info section
const infoSection = {
  marginTop: '16px',
};

const infoText = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
  lineHeight: '1.6',
  backgroundColor: '#f9fafb',
  padding: '16px 20px',
  borderRadius: '6px',
};

// Footer
const footer = {
  padding: '24px 32px 32px',
};

const footerDivider = {
  borderTop: '1px solid #e5e7eb',
  margin: '0 0 24px',
};

const footerText = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0 0 16px',
  lineHeight: '1.6',
};

const footerBrand = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 8px',
};

const copyright = {
  fontSize: '12px',
  color: '#9ca3af',
  margin: '0',
  lineHeight: '1.5',
};
