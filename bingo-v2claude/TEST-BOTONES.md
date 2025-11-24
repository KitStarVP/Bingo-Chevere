# ✅ Test de Botones - Panel Admin

## Instrucciones de Prueba

### 1. **Gestión de Pagos** 💳

#### Stats Boxes (Filtros)
- [ ] Click en "Pendientes" → Filtra pagos pendientes
- [ ] Click en "Verificados" → Filtra pagos verificados
- [ ] Click en "Rechazados" → Filtra pagos rechazados

#### Botones de Pago
- [ ] ✓ Aprobar → Cambia status a 'verified' y genera cartones
- [ ] ✗ Rechazar → Cambia status a 'rejected'

**Verificar:**
- Alerta de confirmación
- Actualización en tiempo real
- Cartones generados en playerCards/{telefono}

---

### 2. **Verificación de BINGO** 🎯

#### Cuando hay BINGO pendiente
- [ ] ✓ Verificar → Guarda ganador, crea premio, envía resultado
- [ ] ✗ Rechazar → Rechaza BINGO, limpia pendiente

**Verificar:**
- Datos del ganador mostrados correctamente
- Premio calculado según ronda
- Actualización en winners/ y prizes/

---

### 3. **Control del Juego** 🎮

#### Botones de Control
- [ ] 🚀 Iniciar Juego → gameActive: true, limpia números
- [ ] ⏸️ Pausar → gameActive: false, isPaused: true
- [ ] ▶️ Reanudar → gameActive: true, isPaused: false
- [ ] ➡️ Ronda 2 → currentRound: 2, resetea cartones
- [ ] 🏁 Finalizar → gameActive: false, expira cartones

**Verificar:**
- Status badge cambia de color
- Botones se muestran/ocultan correctamente
- Estado en Firebase actualizado
- Ronda mostrada correctamente

---

### 4. **Gestión de Premios** 💰

#### Tabs
- [ ] Tab "Pendientes" → Muestra premios pending
- [ ] Tab "Pagados" → Muestra premios paid

#### Botones
- [ ] ✓ Marcar Pagado → Cambia status a 'paid'

**Verificar:**
- Contador de premios actualizado
- Tab activo con estilo correcto
- Premio actualizado en Firebase

---

### 5. **Estadísticas** 📊

**Verificar que se actualicen:**
- [ ] Cartones Vendidos
- [ ] Premio Ronda
- [ ] Total Recaudado
- [ ] Total Premios

---

### 6. **Gestión de Usuarios** 👥

#### Búsqueda
- [ ] 🔍 Buscar → Busca usuario por teléfono
- [ ] Muestra perfil con estadísticas
- [ ] Muestra cartones (vigentes, en uso, vencidos)

**Verificar:**
- Alerta si no existe usuario
- Perfil se muestra correctamente
- Estadísticas correctas

---

### 7. **Historial de Ganadores** 🏆

#### Filtros
- [ ] Filtro por fecha
- [ ] Filtro por teléfono
- [ ] 🔍 Buscar → Aplica filtros

**Verificar:**
- Lista filtrada correctamente
- Últimos 20 ganadores
- Ordenados por más reciente

---

### 8. **Cantado Automático** 🎲

#### Botones
- [ ] ▶️ Iniciar Cantado → Inicia UltraCaller
- [ ] ⏹️ Detener → Detiene UltraCaller
- [ ] 🎯 Cantar Manual → Canta un número

**Verificar:**
- Status badge cambia
- Botones se intercambian
- Último número actualizado
- Números guardados en Firebase

---

### 9. **Mantenimiento** 🔧

#### Botones Peligrosos
- [ ] 🔄 Resetear Cartones → Limpia marcas, deja solo centro
- [ ] ⏰ Expirar Cartones → Cambia status a 'vencido'
- [ ] 🗑️ Limpiar Juego → Resetea gameState y números

**Verificar:**
- Confirmación antes de ejecutar
- Alerta de éxito
- Cambios en Firebase
- Manejo de errores

---

## Checklist de Funcionalidad

### ✅ Todos los botones deben:
- [ ] Tener efecto visual al presionar (scale 0.96)
- [ ] Mostrar alerta de confirmación (si es acción crítica)
- [ ] Mostrar alerta de éxito/error
- [ ] Actualizar Firebase correctamente
- [ ] Actualizar UI en tiempo real
- [ ] Manejar errores (try/catch)
- [ ] Verificar que Firebase existe
- [ ] Funcionar en móvil y desktop

### ✅ Listeners en Tiempo Real:
- [ ] purchases → Actualiza pagos y stats
- [ ] gameState → Actualiza UI del juego
- [ ] prizes → Actualiza premios
- [ ] calledNumbers → Actualiza último número
- [ ] winners → Actualiza historial
- [ ] pendingBingoVerification → Muestra/oculta alerta

---

## Problemas Comunes y Soluciones

### 🔴 Botón no responde
**Solución:** Verificar que window.admin existe y Firebase está inicializado

### 🔴 Error "Cannot read property"
**Solución:** Agregar validaciones null (if (!element) return)

### 🔴 Onclick no funciona
**Solución:** Usar window.admin en lugar de admin

### 🔴 Datos no se actualizan
**Solución:** Verificar que el listener esté activo y el path de Firebase sea correcto

### 🔴 Cartones no se generan
**Solución:** Verificar que window.generateMultipleCards existe

---

## Código de Prueba en Consola

```javascript
// Verificar que todo está cargado
console.log('Firebase:', !!window.firebase);
console.log('Admin:', !!window.admin);
console.log('UltraCaller:', !!window.ultraCaller);
console.log('GenerateCards:', !!window.generateMultipleCards);

// Probar filtro de pagos
window.filterPayments('pending');

// Probar cambio de tab
window.showPrizeTab('paid');

// Ver estado actual
console.log('Payments:', window.admin.payments.length);
console.log('Prizes:', window.admin.prizes.length);
console.log('Winners:', window.admin.winners.length);
console.log('Game Active:', window.admin.gameActive);
console.log('Current Round:', window.admin.currentRound);
```

---

## Resultado Esperado

✅ **TODOS los botones deben funcionar correctamente**
✅ **TODAS las funciones deben actualizar Firebase**
✅ **TODAS las alertas deben mostrarse**
✅ **TODA la UI debe actualizarse en tiempo real**

---

**Fecha de Test:** _____________________
**Testeado por:** _____________________
**Resultado:** ⬜ APROBADO  ⬜ RECHAZADO
