# 📸 Integración de ImageKit - Documentación Backend

## 🎯 Resumen de la Implementación

Se ha implementado **ImageKit.io** como solución CDN para gestión de imágenes (logos de negocios).

### ✅ **Arquitectura Implementada: HÍBRIDA**

1. **Upload desde Cliente (Método Principal)** 
   - El cliente sube directamente a ImageKit
   - Backend solo genera tokens de autenticación
   - Más rápido y escalable

2. **Upload desde Servidor (Método Secundario)**
   - Para casos especiales (migraciones, admin, etc)
   - Procesamiento batch
   - Integraciones externas

---

## 📦 Archivos Creados/Modificados

### **Nuevos Archivos:**
```
gestor_citas_backend/
├── src/
│   ├── services/
│   │   └── imagekit.service.ts       ✅ CREADO
│   ├── controllers/
│   │   └── imagekit.controller.ts    ✅ CREADO
│   └── routes/
│       └── imagekit.routes.ts        ✅ CREADO
```

### **Archivos Modificados:**
```
gestor_citas_backend/
├── .env                               ✅ ACTUALIZADO (credenciales)
├── package.json                       ✅ ACTUALIZADO (@imagekit/nodejs)
├── src/
│   ├── server.ts                      ✅ ACTUALIZADO (registro rutas)
│   ├── services/
│   │   └── negocio.service.ts        ✅ ACTUALIZADO (método actualizarLogo)
│   ├── controllers/
│   │   └── negocio.controller.ts     ✅ ACTUALIZADO (endpoint logo)
│   └── routes/
│       └── negocio.routes.ts         ✅ ACTUALIZADO (ruta PATCH logo)
```

---

## 🔧 Configuración

### **Variables de Entorno (.env)**
```env
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY="public_cHPal5YMqfrS1Exwc/qxpgUD1sQ="
IMAGEKIT_PRIVATE_KEY="private_MKh0GsXwamRKoMD+a/JfSdyp9QI="
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/citayaapp"
```

### **Dependencias Instaladas**
```bash
npm install @imagekit/nodejs
```

---

## 🛣️ Endpoints Disponibles

### **1. GET /api/imagekit/auth**
**Obtener parámetros de autenticación para upload desde cliente**

- **Autenticación:** ❌ No requiere (es público)
- **Propósito:** Generar tokens para que el frontend suba archivos de forma segura

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "uuid-v4",
    "expire": 1699999999,
    "signature": "hmac-sha1-signature",
    "publicKey": "public_cHPal5YMqfrS1Exwc/qxpgUD1sQ=",
    "urlEndpoint": "https://ik.imagekit.io/citayaapp"
  }
}
```

---

### **2. POST /api/imagekit/upload**
**Upload directo desde servidor (casos especiales)**

- **Autenticación:** ✅ JWT Required
- **Propósito:** Subir archivos desde el backend (migraciones, admin, etc)

**Request Body:**
```json
{
  "file": "data:image/png;base64,iVBORw0KGgo..." // base64 string o URL
  "fileName": "logo-negocio.png",
  "folder": "logos",  // Opcional, default: "logos"
  "tags": ["negocio", "logo"]  // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://ik.imagekit.io/citayaapp/logos/logo-negocio.png",
    "fileId": "abc123xyz",
    "thumbnailUrl": "https://ik.imagekit.io/.../tr:n-ik_ml_thumbnail/...",
    "name": "logo-negocio.png",
    "filePath": "/logos/logo-negocio.png",
    "size": 12345
  }
}
```

---

### **3. DELETE /api/imagekit/file/:fileId**
**Eliminar archivo de ImageKit**

- **Autenticación:** ✅ JWT Required
- **Propósito:** Limpiar archivos antiguos cuando se actualiza el logo

**Request:**
```
DELETE /api/imagekit/file/abc123xyz
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### **4. PATCH /api/negocio/logo**
**Actualizar logo del negocio en la BD**

- **Autenticación:** ✅ JWT Required
- **Propósito:** Guardar URL de ImageKit en la base de datos

**Request Body:**
```json
{
  "logoUrl": "https://ik.imagekit.io/citayaapp/logos/logo-negocio.png"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "negocio-uuid",
    "nombre": "Salón María",
    "logo": "https://ik.imagekit.io/citayaapp/logos/logo-negocio.png",
    ...
  },
  "message": "Logo actualizado correctamente"
}
```

---

## 🔄 Flujo de Trabajo Completo

### **Opción A: Upload desde Cliente (RECOMENDADO)**

```
1. FRONTEND solicita → GET /api/imagekit/auth
   ↓
2. BACKEND genera → { token, signature, expire, publicKey, urlEndpoint }
   ↓
3. FRONTEND sube → Directamente a ImageKit CDN
   ↓
4. ImageKit retorna → { url, fileId, ... }
   ↓
5. FRONTEND guarda → PATCH /api/negocio/logo con logoUrl
   ↓
6. BACKEND actualiza → campo logo en BD
```

### **Opción B: Upload desde Servidor (CASOS ESPECIALES)**

```
1. FRONTEND envía → POST /api/imagekit/upload con base64
   ↓
2. BACKEND sube → A ImageKit
   ↓
3. BACKEND retorna → { url, fileId, ... }
   ↓
4. FRONTEND guarda → PATCH /api/negocio/logo con logoUrl
   ↓
5. BACKEND actualiza → campo logo en BD
```

---

## 🎨 Funcionalidades Adicionales del Servicio

### **Métodos Disponibles en `imagekitService`:**

```typescript
// 1. Generar parámetros de auth
imagekitService.getAuthenticationParameters(token?, expire?)

// 2. Upload de archivo
imagekitService.uploadFile(file, fileName, folder?, tags?)

// 3. Validar URL de ImageKit
imagekitService.isValidImageKitUrl(url)

// 4. Eliminar archivo
imagekitService.deleteFile(fileId)

// 5. Generar URL transformada (thumbnails, etc)
imagekitService.generateTransformedUrl(src, transformations?)

// 6. Obtener Public Key
imagekitService.getPublicKey()

// 7. Obtener URL Endpoint
imagekitService.getUrlEndpoint()
```

---

## 🧪 Cómo Probar

### **1. Probar Auth Endpoint (desde Postman o CURL):**
```bash
curl http://localhost:3001/api/imagekit/auth
```

### **2. Probar Upload desde Servidor:**
```bash
curl -X POST http://localhost:3001/api/imagekit/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "file": "https://example.com/image.jpg",
    "fileName": "test-logo.jpg"
  }'
```

### **3. Actualizar Logo en BD:**
```bash
curl -X PATCH http://localhost:3001/api/negocio/logo \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logoUrl": "https://ik.imagekit.io/citayaapp/logos/test-logo.jpg"
  }'
```

---

## 🔒 Seguridad

### **✅ Buenas Prácticas Implementadas:**

1. **Private Key solo en backend** - Nunca se expone al frontend
2. **Tokens con expiración** - 1 hora por defecto (configurable)
3. **Autenticación JWT** - Endpoints de upload/delete requieren auth
4. **Validación de URLs** - Solo URLs válidas (http/https)
5. **Singleton Service** - Una sola instancia de ImageKit
6. **Error Handling** - Manejo robusto de errores

### **⚠️ Consideraciones:**

- El endpoint `/auth` es público (necesario para upload desde cliente)
- Los tokens generados expiran en 1 hora
- Solo usuarios autenticados pueden actualizar logos en BD

---

## 📊 Base de Datos

### **Campo en Tabla `negocio`:**
```prisma
model Negocio {
  id    String  @id @default(uuid())
  logo  String? // ✅ Ya existía - almacena URL de ImageKit
  ...
}
```

No se requieren migraciones adicionales.

---

## 🚀 Próximos Pasos (Frontend)

### **Para implementar en Next.js:**

1. **Instalar SDK de ImageKit para React:**
```bash
npm install imagekitio-react
```

2. **Crear componente de upload:**
```tsx
// components/ImageKitUploader.tsx
import { IKContext, IKUpload } from 'imagekitio-react';

// Obtener auth params desde backend
const getAuthParams = async () => {
  const res = await fetch('/api/imagekit/auth');
  return res.json();
};

// Componente
<IKContext 
  publicKey={authParams.publicKey}
  urlEndpoint={authParams.urlEndpoint}
  authenticator={getAuthParams}
>
  <IKUpload onSuccess={handleSuccess} />
</IKContext>
```

3. **Guardar URL en BD:**
```tsx
const handleSuccess = async (response) => {
  await fetch('/api/negocio/logo', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ logoUrl: response.url })
  });
};
```

---

## 📝 Notas Técnicas

### **Limitaciones del Plan Free de ImageKit:**
- 20GB ancho de banda/mes
- 20GB almacenamiento
- Transformaciones ilimitadas
- Perfecto para empezar

### **Optimizaciones Implementadas:**
- Nombres únicos automáticos (`useUniqueFileName: true`)
- Organización por carpetas (`/logos`)
- Sistema de tags opcional
- Transformaciones on-the-fly disponibles

---

## ✅ Checklist de Validación

- [x] SDK instalado correctamente
- [x] Variables de entorno configuradas
- [x] Servicio de ImageKit creado (Singleton)
- [x] Controlador de endpoints implementado
- [x] Rutas registradas en servidor
- [x] Endpoint de autenticación funcionando
- [x] Endpoint de upload implementado
- [x] Endpoint de delete implementado
- [x] Endpoint de actualizar logo en BD
- [x] Middleware de autenticación aplicado
- [x] Error handling robusto
- [x] Sin errores de TypeScript
- [x] Documentación completa

---

## 🎉 Estado Final

**✅ BACKEND COMPLETAMENTE IMPLEMENTADO Y OPTIMIZADO**

Todos los endpoints están listos para ser consumidos desde el frontend.
La integración es segura, escalable y sigue las mejores prácticas.

---

**Desarrollado por:** GitHub Copilot  
**Fecha:** Noviembre 8, 2025  
**Versión:** 1.0.0
