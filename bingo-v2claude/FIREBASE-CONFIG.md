# ✅ Configuración de Firebase - Bingo Chévere v2

## Estado: CONECTADO ✓

Todos los archivos HTML de la nueva versión están correctamente conectados a Firebase.

---

## 📋 Archivos Configurados

### 1. **index.html** ✓
- Firebase SDK: v12.4.0
- Módulos: `firebase-app`, `firebase-database`
- Funciones: `initializeApp`, `getDatabase`, `ref`, `onValue`
- Uso: Carga de premios en tiempo real

### 2. **comprar.html** ✓
- Firebase SDK: v12.4.0
- Módulos: `firebase-app`, `firebase-database`
- Funciones: `initializeApp`, `getDatabase`, `ref`, `set`, `get`
- Uso: Gestión de compras, PIN de usuarios, guardado de pagos

### 3. **juego.html** ✓
- Firebase SDK: v12.4.0
- Módulos: `firebase-app`, `firebase-database`
- Funciones: `initializeApp`, `getDatabase`, `ref`, `onValue`, `get`, `set`
- Uso: Sala de juego, números cantados, verificación de BINGO, cartones del jugador

### 4. **admin.html** ✓
- Firebase SDK: v12.4.0
- Módulos: `firebase-app`, `firebase-database`
- Funciones: `initializeApp`, `getDatabase`, `ref`, `set`, `get`, `onValue`
- Uso: Panel administrativo completo, gestión de pagos, control del juego, premios

---

## 🔑 Credenciales Firebase

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyAKK_aY4OeEh4NmRIAExKk4T0i7d4Z1_8M",
    authDomain: "bingo-chevere.firebaseapp.com",
    databaseURL: "https://bingo-chevere-default-rtdb.firebaseio.com/",
    projectId: "bingo-chevere",
    storageBucket: "bingo-chevere.firebasestorage.app",
    messagingSenderId: "1057150163831",
    appId: "1:1057150163831:web:0d6e9f70c356ee56b09f72"
};
```

---

## 📊 Estructura de la Base de Datos

```
bingo-chevere-default-rtdb/
├── purchases/                    # Compras de cartones
│   └── {timestamp}/
│       ├── telefono
│       ├── cartones
│       ├── referencia
│       ├── monto
│       ├── status (pending/verified/rejected)
│       └── timestamp
│
├── playerCards/                  # Cartones de jugadores
│   └── {telefono}/
│       └── {cartonId}/
│           ├── numbers (array 25)
│           ├── marked (array 25)
│           └── expired (boolean)
│
├── gameState/                    # Estado del juego
│   ├── active (boolean)
│   ├── paused (boolean)
│   ├── round (1 o 2)
│   └── pattern (array)
│
├── calledNumbers/                # Números cantados
│   └── {number}: timestamp
│
├── pendingBingoVerification/     # BINGO pendiente
│   ├── telefono
│   ├── cartonId
│   ├── type (pattern/full)
│   └── timestamp
│
├── bingoVerificationResult/      # Resultado verificación
│   ├── valid (boolean)
│   └── message
│
├── winners/                      # Ganadores
│   └── {timestamp}/
│       ├── telefono
│       ├── cartonId
│       ├── type
│       ├── prize
│       └── date
│
├── prizes/                       # Premios
│   └── {winnerId}/
│       ├── amount
│       ├── status (pending/paid)
│       └── date
│
└── users/                        # Usuarios
    └── {telefono}/
        ├── pin (hash)
        ├── createdAt
        └── lastPurchase
```

---

## 🔄 Funciones JavaScript que Usan Firebase

### landing.js
- `loadPrizes()`: Escucha cambios en `/purchases` para calcular premios

### comprar.js
- `checkUserPin()`: Lee/escribe PIN en `/users/{telefono}`
- `savePurchase()`: Guarda compra en `/purchases/{timestamp}`

### juego.js
- `loadPlayerCards()`: Lee cartones de `/playerCards/{telefono}`
- `listenToCalledNumbers()`: Escucha `/calledNumbers`
- `listenToGameState()`: Escucha `/gameState`
- `sendBingoVerification()`: Escribe en `/pendingBingoVerification`
- `listenToBingoResult()`: Escucha `/bingoVerificationResult`

### admin.js
- `loadPayments()`: Escucha `/purchases`
- `approvePayment()`: Actualiza status y genera cartones
- `verifyBingo()`: Lee `/pendingBingoVerification` y escribe resultado
- `startGame()`: Actualiza `/gameState`
- `loadWinners()`: Lee `/winners`
- `loadUsers()`: Lee `/users`

### ultra-caller.js
- `callNumber()`: Escribe en `/calledNumbers`
- `listenToGameState()`: Escucha `/gameState` para auto-start/stop

---

## ✅ Verificación

Para verificar que Firebase está funcionando:

1. Abre la consola del navegador (F12)
2. Busca el mensaje: `Firebase inicializado en [archivo].html`
3. Verifica que no haya errores de conexión
4. Prueba cualquier función que use Firebase (comprar, jugar, admin)

---

## 🚀 Diferencias con la Versión Original

### Versión Original
- Firebase SDK v12.4.0
- Configuración en cada HTML
- Misma base de datos

### Versión Nueva (v2claude)
- ✅ Firebase SDK v12.4.0 (IGUAL)
- ✅ Configuración en cada HTML (IGUAL)
- ✅ Misma base de datos (IGUAL)
- ✅ Mismas credenciales (IGUAL)
- ✅ Misma estructura de datos (IGUAL)

**CONCLUSIÓN: Ambas versiones comparten la MISMA base de datos Firebase y funcionan en paralelo.**

---

## 📝 Notas Importantes

1. **Compatibilidad Total**: La nueva versión usa exactamente la misma configuración de Firebase que la original
2. **Base de Datos Compartida**: Ambas versiones leen/escriben en la misma base de datos
3. **Sin Conflictos**: Pueden funcionar simultáneamente sin problemas
4. **Migración Transparente**: Los usuarios pueden usar cualquiera de las dos versiones
5. **Datos Sincronizados**: Los cambios en una versión se reflejan en la otra instantáneamente

---

Fecha: 2024
Versión: 2.0 (Mobile-First)
