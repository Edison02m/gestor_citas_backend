# API de Gestión de Citas - CitaYA

## 📋 Tabla de Contenidos
- [Endpoints Disponibles](#endpoints-disponibles)
- [Modelos de Datos](#modelos-de-datos)
- [Ejemplos de Uso](#ejemplos-de-uso)

## 🚀 Endpoints Disponibles

### Base URL
```
http://localhost:3001/api/citas
```

Todas las rutas requieren:
- ✅ Autenticación (Token JWT)
- ✅ Suscripción activa

---

### 1. Crear Cita
```http
POST /api/citas
```

**Body:**
```json
{
  "fecha": "2024-10-25",
  "horaInicio": "09:00",
  "horaFin": "10:00",
  "clienteId": "uuid-cliente",
  "servicioId": "uuid-servicio",
  "empleadoId": "uuid-empleado",  // Opcional
  "sucursalId": "uuid-sucursal",
  "notas": "Cliente prefiere corte corto",
  "canalOrigen": "MANUAL"  // MANUAL | WEB | WHATSAPP
}
```

**Nota:** El `precioTotal` se calcula automáticamente desde el precio del servicio.

**Validaciones:**
- ✅ Cliente debe existir y pertenecer al negocio
- ✅ Servicio debe estar activo
- ✅ Sucursal debe estar activa
- ✅ Empleado debe estar activo (si se especifica)
- ✅ No puede haber conflicto de horario con el empleado
- ✅ El precio se toma automáticamente del servicio
- ✅ **Si NO se especifica empleado**: Valida capacidad de la sucursal
  - Cuenta empleados disponibles (activos, con horario, sin bloqueos)
  - Cuenta citas simultáneas en ese horario
  - Solo permite si hay empleados suficientes

---

### 2. Listar Citas con Filtros
```http
GET /api/citas?page=1&limit=50
```

**Query Parameters:**
- `fechaInicio` (opcional): "2024-10-01"
- `fechaFin` (opcional): "2024-10-31"
- `clienteId` (opcional): UUID
- `empleadoId` (opcional): UUID
- `sucursalId` (opcional): UUID
- `servicioId` (opcional): UUID
- `estado` (opcional): PENDIENTE | CONFIRMADA | COMPLETADA | CANCELADA | NO_ASISTIO
- `canalOrigen` (opcional): MANUAL | WEB | WHATSAPP
- `page` (opcional): número de página (default: 1)
- `limit` (opcional): items por página (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

---

### 3. Obtener Cita por ID
```http
GET /api/citas/:id
```

**Response:** Cita con todas las relaciones (cliente, servicio, empleado, sucursal)

---

### 4. Obtener Citas por Fecha
```http
GET /api/citas/fecha/:fecha?sucursalId=uuid
```

**Ejemplo:**
```http
GET /api/citas/fecha/2024-10-25?sucursalId=abc-123
```

**Response:** Array de citas del día ordenadas por hora

---

### 5. Actualizar Cita
```http
PUT /api/citas/:id
```

**Body (todos los campos son opcionales):**
```json
{
  "fecha": "2024-10-26",
  "horaInicio": "10:00",
  "horaFin": "11:00",
  "empleadoId": "otro-uuid",
  "sucursalId": "otra-sucursal",
  "notas": "Nuevas notas",
  "estado": "CONFIRMADA"
}
```

**Nota:** Si cambias el `servicioId`, el `precioTotal` se recalculará automáticamente.

---

### 6. Cambiar Estado
```http
PATCH /api/citas/:id/estado
```

**Body:**
```json
{
  "estado": "CONFIRMADA"
}
```

**Atajos de estado:**
- `PATCH /api/citas/:id/confirmar` - Confirmar cita
- `PATCH /api/citas/:id/completar` - Completar cita
- `PATCH /api/citas/:id/cancelar` - Cancelar cita
- `PATCH /api/citas/:id/no-asistio` - Marcar como no asistió

---

### 7. Eliminar Cita
```http
DELETE /api/citas/:id
```

---

### 8. Obtener Disponibilidad
```http
POST /api/citas/disponibilidad
```

**Body:**
```json
{
  "empleadoId": "uuid",  // Opcional
  "sucursalId": "uuid",
  "servicioId": "uuid",
  "fecha": "2024-10-25"
}
```

**Validaciones aplicadas:**
- ✅ Verifica horario de apertura/cierre de la sucursal
- ✅ Verifica horario de trabajo del empleado (si se especifica)
- ✅ **Excluye períodos de descanso de la sucursal** (ej: almuerzo)
- ✅ **Excluye períodos de descanso del empleado** (ej: break)
- ✅ Excluye bloqueos del empleado (vacaciones, días libres)
- ✅ Excluye horarios ocupados por otras citas
- ✅ Slots generados según duración del servicio

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "horaInicio": "09:00",
      "horaFin": "09:30",
      "disponible": true
    },
    {
      "horaInicio": "09:30",
      "horaFin": "10:00",
      "disponible": false
    },
    {
      "horaInicio": "13:00",
      "horaFin": "13:30",
      "disponible": false  // ❌ En período de descanso
    }
  ]
}
```

---

### 9. Obtener Estadísticas
```http
GET /api/citas/estadisticas/general?fechaInicio=2024-10-01&fechaFin=2024-10-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCitas": 150,
    "citasPendientes": 20,
    "citasConfirmadas": 30,
    "citasCompletadas": 85,
    "citasCanceladas": 10,
    "citasNoAsistio": 5,
    "ingresoTotal": 2500.00
  }
}
```

---

### 10. Próximas Citas de un Cliente
```http
GET /api/citas/cliente/:clienteId/proximas
```

**Response:** Próximas 5 citas del cliente (PENDIENTE o CONFIRMADA)

---

### 11. Historial de Citas de un Cliente
```http
GET /api/citas/cliente/:clienteId/historial
```

**Response:** Últimas 10 citas del cliente (COMPLETADA, CANCELADA, NO_ASISTIO)

---

## 📊 Modelos de Datos

### EstadoCita
```typescript
enum EstadoCita {
  PENDIENTE    // Cita creada, sin confirmar
  CONFIRMADA   // Cliente confirmó asistencia
  COMPLETADA   // Servicio completado
  CANCELADA    // Cita cancelada
  NO_ASISTIO   // Cliente no se presentó
}
```

### CanalOrigen
```typescript
enum CanalOrigen {
  MANUAL      // Creada por el negocio
  WEB         // Reserva desde página web
  WHATSAPP    // Reserva por WhatsApp
}
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Crear una cita
```bash
curl -X POST http://localhost:3001/api/citas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha": "2024-10-25",
    "horaInicio": "09:00",
    "horaFin": "10:00",
    "clienteId": "client-uuid",
    "servicioId": "service-uuid",
    "empleadoId": "employee-uuid",
    "sucursalId": "branch-uuid"
  }'
```
**Nota:** El precio se calcula automáticamente desde el servicio.

### Ejemplo 2: Ver citas del día
```bash
curl -X GET "http://localhost:3001/api/citas/fecha/2024-10-25?sucursalId=branch-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ejemplo 3: Confirmar una cita
```bash
curl -X PATCH http://localhost:3001/api/citas/cita-uuid/confirmar \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ejemplo 4: Filtrar citas completadas de un cliente
```bash
curl -X GET "http://localhost:3001/api/citas?clienteId=client-uuid&estado=COMPLETADA" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Ejemplo 5: Ver horarios disponibles
```bash
curl -X POST http://localhost:3001/api/citas/disponibilidad \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "empleadoId": "employee-uuid",
    "sucursalId": "branch-uuid",
    "servicioId": "service-uuid",
    "fecha": "2024-10-25"
  }'
```

---

## 🔥 Características Destacadas

### ✅ Validaciones Inteligentes
- Verifica conflictos de horario automáticamente
- Valida que empleado trabaje en la sucursal
- Verifica disponibilidad antes de crear/actualizar
- **Excluye automáticamente períodos de descanso**
- **Respeta bloqueos de empleados (vacaciones, permisos)**
- Valida horarios de apertura/cierre de sucursal
- **Validación de capacidad inteligente:**
  - Con empleado asignado: Valida disponibilidad del empleado
  - Sin empleado asignado: Valida capacidad total de la sucursal
  - Considera empleados disponibles vs citas simultáneas
  - Respeta horarios de trabajo y bloqueos de empleados

### ⚡ Rendimiento Optimizado
- Queries con índices en campos clave
- Paginación eficiente
- Consultas paralelas con `Promise.all`

### 📈 Análisis y Reportes
- Estadísticas en tiempo real
- Historial completo de clientes
- Filtros avanzados para reportes personalizados

### 🔒 Seguridad
- Todas las operaciones validadas por negocio
- Auditoría de quién crea/modifica
- Middleware de autenticación y suscripción

---

## 🎯 Casos de Uso Comunes

### Agendar nueva cita desde panel admin
1. Obtener disponibilidad: `POST /disponibilidad`
2. Crear cita: `POST /citas`

### Ver agenda del día
1. Obtener citas: `GET /fecha/2024-10-25`

### Gestionar estado de citas
1. Cliente confirma: `PATCH /:id/confirmar`
2. Completar servicio: `PATCH /:id/completar`
3. Cliente no llegó: `PATCH /:id/no-asistio`

### Reportes y análisis
1. Estadísticas del mes: `GET /estadisticas/general?fechaInicio=...&fechaFin=...`
2. Historial de cliente: `GET /cliente/:id/historial`
3. Filtrar canceladas: `GET /citas?estado=CANCELADA`

---

## 📝 Notas Importantes

- **Empleado opcional**: Las citas pueden crearse sin asignar empleado
- **Validación de capacidad**: 
  - **Con empleado**: Verifica que el empleado específico esté disponible
  - **Sin empleado**: Valida que haya empleados disponibles en la sucursal para atender la cita
  - Considera horarios de trabajo, bloqueos y citas existentes
- **Precio automático**: El `precioTotal` se calcula automáticamente desde el servicio. Si actualizas el `servicioId`, el precio se recalcula.
- **Conflictos**: Solo se validan conflictos para citas NO canceladas
- **Horarios de descanso**: Los slots de disponibilidad excluyen automáticamente:
  - Períodos de descanso de la sucursal (ej: 13:00-14:00)
  - Períodos de descanso del empleado (ej: breaks personalizados)
  - Bloqueos del empleado (vacaciones, días libres)
- **Slots**: Los slots de disponibilidad se generan cada 30 minutos
- **Auditoría**: Se guarda quién creó y modificó cada cita
- **Timestamps**: `createdAt` y `updatedAt` se manejan automáticamente

---

¡Sistema de citas completamente funcional y optimizado! 🚀
