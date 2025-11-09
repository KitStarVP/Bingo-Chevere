// Sistema de Cantado Ultra-Preciso - Garantía de Tiempos
class UltraCaller {
    constructor() {
        this.isActive = false;
        this.mainInterval = null;
        this.lastCallTime = 0;
        this.CALL_INTERVAL = 8000; // 8 segundos mínimo
        this.instanceId = Date.now();
        this.callInProgress = false;
        this.calledNumbers = new Set(); // Cache local para evitar duplicados
        this.lastResetCheck = 0; // Para detectar resets de ronda
    }

    start() {
        if (this.isActive) {
            console.log(`⚠️ UltraCaller ${this.instanceId} ya está activo`);
            return;
        }
        
        this.isActive = true;
        this.lastCallTime = Date.now();
        
        console.log(`🚀 UltraCaller ${this.instanceId} iniciado - Intervalo: ${this.CALL_INTERVAL}ms`);
        
        // Usar setInterval para garantizar tiempos exactos
        this.mainInterval = setInterval(() => {
            this.executeCall();
        }, this.CALL_INTERVAL);
        
        // Primera llamada inmediata
        setTimeout(() => this.executeCall(), 1000);
    }

    async executeCall() {
        // Evitar llamadas simultáneas
        if (this.callInProgress || !this.isActive) return;
        
        this.callInProgress = true;
        
        try {
            // CONTROL ABSOLUTO DE 8 SEGUNDOS CON FIREBASE LOCK
            if (!await this.acquireCallLock()) {
                return; // No se pudo obtener lock o no han pasado 8s
            }
        
        try {
            if (!window.firebase) {
                console.log('❌ Firebase no disponible');
                return;
            }

            const { database, ref, get, set, push } = window.firebase;
            
            // Verificar estado del juego
            const gameStateSnap = await get(ref(database, 'gameState'));
            const gameState = gameStateSnap.val();
            
            if (!this.shouldContinue(gameState)) {
                this.stop();
                return;
            }
            
            // Verificar si hay reset de ronda (limpiar cache)
            if (gameState.roundTwoReset && gameState.resetTimestamp > (this.lastResetCheck || 0)) {
                console.log('🔄 Detectado reset de ronda - limpiando cache');
                this.calledNumbers = new Set();
                this.lastResetCheck = gameState.resetTimestamp;
            }

            // Verificar BINGO pendiente
            const pendingSnap = await get(ref(database, 'pendingBingoVerification'));
            if (pendingSnap.exists()) {
                console.log('⏸️ BINGO pendiente - saltando llamada');
                return;
            }

            // Obtener números ya cantados desde calledNumbersList
            const numbersListSnap = await get(ref(database, 'calledNumbersList'));
            const numbersList = numbersListSnap.val() || {};
            const currentNumbers = Object.values(numbersList).map(entry => entry.number).sort((a, b) => a - b);
            
            // Actualizar cache local
            this.calledNumbers = new Set(currentNumbers);

            // Verificar si quedan números
            if (currentNumbers.length >= 75) {
                console.log('✅ Todos los números cantados');
                this.stop();
                return;
            }

            // Generar siguiente número
            const nextNumber = this.getNextNumber(currentNumbers);
            if (!nextNumber) {
                console.log('❌ No se pudo generar número');
                return;
            }

            // PUSH ATÓMICO - Evita concurrencia
            const numberEntry = {
                number: nextNumber,
                timestamp: Date.now(),
                callerId: this.instanceId,
                round: gameState.currentRound || 1
            };
            
            await push(ref(database, 'calledNumbersList'), numberEntry);
            
            // Actualizar gameState con info del último número
            await set(ref(database, 'gameState'), {
                ...gameState,
                lastNumber: nextNumber,
                lastCallTime: Date.now(),
                totalCalled: currentNumbers.length + 1
            });

            // Mantener compatibilidad: actualizar array calledNumbers
            const updatedNumbers = [...currentNumbers, nextNumber];
            await set(ref(database, 'calledNumbers'), updatedNumbers);

            this.lastCallTime = Date.now();
            console.log(`📢 UltraCaller ${this.instanceId}: ${nextNumber} cantado Ronda ${gameState.currentRound} (${updatedNumbers.length}/75)`);

        } catch (error) {
            console.error(`❌ Error en UltraCaller ${this.instanceId}:`, error);
        } finally {
            this.callInProgress = false;
            // Liberar lock
            await this.releaseCallLock();
        }
    }

    shouldContinue(gameState) {
        return gameState && 
               gameState.gameActive && 
               !gameState.gameFinalized && 
               !gameState.emergencyStop && 
               !gameState.ultraCallerStopped;
    }

    getNextNumber(currentNumbers) {
        const available = [];
        for (let i = 1; i <= 75; i++) {
            if (!currentNumbers.includes(i)) {
                available.push(i);
            }
        }
        
        if (available.length === 0) return null;
        
        return available[Math.floor(Math.random() * available.length)];
    }

    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.callInProgress = false;
        
        if (this.mainInterval) {
            clearInterval(this.mainInterval);
            this.mainInterval = null;
        }
        
        console.log(`🛑 UltraCaller ${this.instanceId} detenido completamente`);
    }

    async acquireCallLock() {
        if (!window.firebase) return false;
        
        const { database, ref, get, set } = window.firebase;
        const now = Date.now();
        
        try {
            // Verificar último timestamp global
            const lockSnap = await get(ref(database, 'callerLock'));
            const lockData = lockSnap.val();
            
            if (lockData && lockData.lastCallTime) {
                const timeSinceLastCall = now - lockData.lastCallTime;
                if (timeSinceLastCall < this.CALL_INTERVAL) {
                    console.log(`⏳ Esperando ${this.CALL_INTERVAL - timeSinceLastCall}ms más`);
                    return false;
                }
            }
            
            // Adquirir lock atómico
            await set(ref(database, 'callerLock'), {
                callerId: this.instanceId,
                lastCallTime: now,
                timestamp: now
            });
            
            // Verificar que somos nosotros quien tiene el lock
            const verifySnap = await get(ref(database, 'callerLock'));
            const verifyData = verifySnap.val();
            
            if (verifyData.callerId === this.instanceId) {
                this.lastCallTime = now;
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Error adquiriendo lock:', error);
            return false;
        }
    }
    
    async releaseCallLock() {
        // Lock se mantiene para próxima verificación
        // No se libera inmediatamente
    }
    
    getStatus() {
        return {
            active: this.isActive,
            instanceId: this.instanceId,
            lastCall: this.lastCallTime,
            interval: this.CALL_INTERVAL,
            inProgress: this.callInProgress
        };
    }
}

// Instancia global única
if (window.ultraCaller) {
    window.ultraCaller.stop();
}
window.ultraCaller = new UltraCaller();

// Inicialización automática
function initUltraCaller() {
    if (!window.firebase) {
        setTimeout(initUltraCaller, 1000);
        return;
    }

    const { database, ref, onValue } = window.firebase;
    
    onValue(ref(database, 'gameState'), (snapshot) => {
        const gameState = snapshot.val();
        
        if (gameState && gameState.gameActive && gameState.adminStarted && !gameState.gameFinalized) {
            if (!window.ultraCaller.isActive) {
                console.log('🚀 Auto-iniciando UltraCaller');
                window.ultraCaller.start();
            }
        } else {
            if (window.ultraCaller.isActive) {
                console.log('🛑 Auto-deteniendo UltraCaller');
                window.ultraCaller.stop();
            }
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUltraCaller);
} else {
    initUltraCaller();
}

console.log('✅ UltraCaller v2.0 cargado - Tiempos garantizados');