# 🎯 Validación Inteligente de Capacidad de Citas

## 📋 Resumen

El sistema implementa una **validación inteligente de capacidad** que garantiza que nunca se sobrecargue una sucursal con más citas de las que puede atender.

---

## 🔍 Casos de Validación

### **CASO 1: Cita CON empleado asignado** 👨‍💼✅

**Validación:** Solo verifica disponibilidad del empleado específico.

```
Sucursal tiene 3 empleados: Juan, María, Pedro

✅ Cita 10:00 - Juan → OK (Juan libre)
✅ Cita 10:00 - María → OK (María libre)
✅ Cita 10:00 - Pedro → OK (Pedro libre)
❌ Cita 10:00 - Juan → ERROR: "El empleado ya tiene una cita en ese horario"
```

**Reglas:**
- ✅ El empleado NO debe tener otra cita en ese horario
- ✅ El empleado debe estar ACTIVO
- ✅ El empleado debe trabajar en esa sucursal
- ✅ El horario debe estar dentro de su horario laboral
- ✅ El horario NO debe estar en su período de descanso
- ✅ El empleado NO debe tener bloqueos (vacaciones/permisos)

---

### **CASO 2: Cita SIN empleado asignado** 👤❌

**Validación:** Verifica capacidad total de la sucursal.

```
Sucursal tiene 2 empleados activos: Juan y María

✅ Cita 10:00 sin empleado → OK (capacidad: 1/2)
✅ Cita 10:00 sin empleado → OK (capacidad: 2/2)
❌ Cita 10:00 sin empleado → ERROR: "No hay capacidad disponible"
```

**Reglas:**
- ✅ Cuenta empleados ACTIVOS de la sucursal
- ✅ Filtra empleados que NO tienen horario ese día
- ✅ Filtra empleados con bloqueos de día completo
- ✅ Filtra empleados con bloqueos de horas solapadas
- ✅ Filtra empleados fuera de su horario laboral
- ✅ Filtra empleados en horario de descanso
- ✅ Cuenta citas simultáneas (con y sin empleado)
- ✅ **Permite cita si**: Empleados disponibles > Citas simultáneas

---

### **CASO 3: Mezcla de citas con/sin empleado** 🔀

**Validación:** Considera ambos tipos al calcular capacidad.

```
Sucursal tiene 3 empleados: Juan, María, Pedro

✅ Cita 10:00 - Juan → OK
✅ Cita 10:00 - María → OK
✅ Cita 10:00 sin empleado → OK (Pedro disponible)
❌ Cita 10:00 sin empleado → ERROR (no quedan empleados)
```

---

### **CASO 4: Empleados con bloqueos** 🚫

```
Sucursal tiene 3 empleados: Juan, María, Pedro
Juan tiene vacaciones ese día

Empleados disponibles: 2 (María y Pedro)

✅ Cita 10:00 sin empleado → OK (1/2)
✅ Cita 10:00 sin empleado → OK (2/2)
❌ Cita 10:00 sin empleado → ERROR (capacidad llena)
```

---

### **CASO 5: Empleados con descansos** ⏰

```
Sucursal: 09:00 - 18:00, descanso 13:00-14:00
Empleado Juan: 09:00 - 18:00, descanso 12:00-12:30

Cita 12:15 - 12:45:
- Solapa con descanso de Juan (12:00-12:30) → Juan NO disponible
- Otros empleados SÍ disponibles

✅ Si hay 2+ empleados → OK
❌ Si solo está Juan → ERROR
```

---

### **CASO 6: Horarios fuera de jornada laboral** 🕐

```
Empleado trabaja: 09:00 - 17:00
Cita: 17:30 - 18:00

❌ Este empleado NO se cuenta como disponible
✅ Solo se cuentan empleados cuyo horario cubra la cita completa
```

---

## 🎯 Algoritmo de Validación

### **Para citas CON empleado:**
```
1. Verificar que empleado existe y está activo
2. Verificar que trabaja en la sucursal
3. Obtener su horario para ese día de la semana
4. Verificar bloqueos de día completo → RECHAZAR
5. Verificar bloqueos de horas → Si solapa → RECHAZAR
6. Verificar horario de trabajo → Si cita fuera → RECHAZAR
7. Verificar descanso → Si solapa → RECHAZAR
8. Buscar conflictos con otras citas → Si hay → RECHAZAR
9. ✅ ACEPTAR
```

### **Para citas SIN empleado:**
```
1. Obtener todos los empleados de la sucursal
2. Filtrar solo ACTIVOS
3. Para cada empleado:
   a. Obtener horario del día de la semana
   b. Si no tiene horario → DESCARTAR
   c. Si tiene bloqueo día completo → DESCARTAR
   d. Si tiene bloqueo de horas solapado → DESCARTAR
   e. Si cita fuera de horario laboral → DESCARTAR
   f. Si cita en horario de descanso → DESCARTAR
4. Contar empleados disponibles resultantes
5. Contar citas simultáneas existentes (todas)
6. Si empleados_disponibles > citas_simultáneas → ✅ ACEPTAR
7. Sino → ❌ RECHAZAR
```

---

## 📊 Ejemplos Detallados

### **Ejemplo 1: Barbería con 2 empleados**

**Configuración:**
```
Barbería "StyleCut"
Empleados: Juan y Carlos (ambos activos)

Horarios:
- Juan: Lunes-Viernes 09:00-18:00, descanso 13:00-14:00
- Carlos: Lunes-Viernes 10:00-19:00, descanso 14:00-15:00
```

**Escenario 1: Martes 10:00-10:30**
```
✅ Empleados disponibles: 2 (Juan y Carlos)
✅ Cita 1 sin empleado → OK (1/2)
✅ Cita 2 sin empleado → OK (2/2)
❌ Cita 3 sin empleado → ERROR
```

**Escenario 2: Martes 13:00-13:30 (descanso de Juan)**
```
✅ Empleados disponibles: 1 (solo Carlos)
✅ Cita 1 sin empleado → OK (1/1)
❌ Cita 2 sin empleado → ERROR
```

**Escenario 3: Martes 14:00-14:30 (descansos solapados)**
```
❌ Juan en descanso 13:00-14:00 → parcialmente
✅ Juan disponible desde 14:00
❌ Carlos en descanso 14:00-15:00
✅ Empleados disponibles: 1 (Juan)
✅ Cita 1 sin empleado → OK
❌ Cita 2 sin empleado → ERROR
```

---

### **Ejemplo 2: Spa con 4 empleados**

**Configuración:**
```
Spa "Relax"
Empleados: Ana, Bety, Carol, Diana

Situación del día:
- Ana: Vacaciones (bloqueo día completo)
- Bety: Permiso médico 10:00-12:00
- Carol: Normal
- Diana: Normal
```

**Escenario: 11:00-12:00**
```
❌ Ana: Vacaciones → NO disponible
❌ Bety: Permiso 10:00-12:00 → NO disponible
✅ Carol: Disponible
✅ Diana: Disponible

Empleados disponibles: 2
✅ Cita 1 - Carol → OK
✅ Cita 2 - Diana → OK
✅ Cita 3 sin empleado → ERROR (no quedan empleados)
```

---

## 🔥 Ventajas del Sistema

### **1. Previene Sobrecarga** 🚫
- Nunca se agendan más citas de las que se pueden atender
- Considera disponibilidad real de empleados

### **2. Flexibilidad** 🎨
- Permite citas con o sin empleado asignado
- Útil para negocios que asignan empleados después

### **3. Inteligente** 🧠
- Considera horarios, descansos, bloqueos
- Cálculo en tiempo real de capacidad disponible

### **4. Realista** ✅
- No solo cuenta empleados activos
- Filtra según disponibilidad real del momento

---

## 💡 Recomendaciones de Uso

### **Para negocios pequeños (1-3 empleados):**
```
Recomendación: Asignar empleado en cada cita
✅ Mejor control de agenda
✅ Clientes saben quién los atenderá
✅ Evita confusiones
```

### **Para negocios medianos (4-10 empleados):**
```
Opción A: Asignar empleado si cliente lo solicita
Opción B: Sin empleado para asignación flexible
✅ Permite optimizar recursos
✅ Cubre ausencias imprevistas
```

### **Para negocios grandes (10+ empleados):**
```
Recomendación: Sistema mixto
- Servicios premium → Con empleado específico
- Servicios regulares → Sin empleado (flexible)
✅ Máxima eficiencia
✅ Satisface preferencias de clientes
```

---

## 🎯 Resumen de Validaciones

| Tipo de Cita | Validación Principal | Factores Considerados |
|--------------|---------------------|----------------------|
| **Con empleado** | Disponibilidad del empleado | Horario, descansos, bloqueos, citas existentes |
| **Sin empleado** | Capacidad de sucursal | Empleados disponibles vs citas simultáneas |

**Fórmula para citas sin empleado:**
```
PERMITIR si: EmpleadosDisponibles > CitasSimultáneas
```

**Empleados Disponibles:**
```
= Empleados ACTIVOS
- Sin horario ese día
- Con bloqueo día completo
- Con bloqueo de horas solapado
- Fuera de horario laboral
- En horario de descanso
```

---

¡Sistema robusto que garantiza capacidad adecuada en todo momento! 🚀
