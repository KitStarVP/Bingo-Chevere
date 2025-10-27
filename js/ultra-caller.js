// Sistema de Cantado Ultra-Preciso - Garantía de Tiempos
class UltraCaller {
    constructor() {
        this.isActive = false;
        this.mainInterval = null;
        this.lastCallTime = 0;
        this.CALL_INTERVAL = 15000; // 15 segundos exactos
        this.instanceId = Date.now();
        this.callInProgress = false;
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
            if (!window.firebase) {
                console.log('❌ Firebase no disponible');
                return;
            }

            const { database, ref, get, set } = window.firebase;
            
            // Verificar estado del juego
            const gameStateSnap = await get(ref(database, 'gameState'));
            const gameState = gameStateSnap.val();
            
            if (!this.shouldContinue(gameState)) {
                this.stop();
                return;
            }

            // Verificar BINGO pendiente
            const pendingSnap = await get(ref(database, 'pendingBingoVerification'));
            if (pendingSnap.exists()) {
                console.log('⏸️ BINGO pendiente - saltando llamada');
                return;
            }

            // Obtener números cantados
            const numbersSnap = await get(ref(database, 'calledNumbers'));
            const currentNumbers = numbersSnap.val() || [];

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

            // Actualizar Firebase
            const updatedNumbers = [...currentNumbers, nextNumber];
            await set(ref(database, 'calledNumbers'), updatedNumbers);
            
            await set(ref(database, 'gameState'), {
                ...gameState,
                lastNumber: nextNumber,
                lastCallTime: Date.now(),
                totalCalled: updatedNumbers.length
            });

            this.lastCallTime = Date.now();
            console.log(`📢 UltraCaller ${this.instanceId}: ${nextNumber} cantado (${updatedNumbers.length}/75)`);

        } catch (error) {
            console.error(`❌ Error en UltraCaller ${this.instanceId}:`, error);
        } finally {
            this.callInProgress = false;
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