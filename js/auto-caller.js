// Sistema de Cantado Automático Independiente
class AutoCaller {
    constructor() {
        this.isRunning = false;
        this.calledNumbers = [];
        this.gameId = null;
        this.scheduler = null;
        this.keepAlive = null;
    }

    async start(gameId) {
        if (this.isRunning) return;
        
        this.gameId = gameId;
        this.isRunning = true;
        
        console.log('🎯 Iniciando cantado automático independiente para juego:', gameId);
        
        // Sistema robusto de cantado
        this.startRobustCalling();
    }

    startRobustCalling() {
        let lastCallTime = Date.now();
        const CALL_INTERVAL = 6000; // 6 segundos
        
        const scheduleNextCall = async () => {
            if (!this.isRunning || !window.firebase) return;
            
            try {
                const { database, ref, get, set } = window.firebase;
                
                // Verificar estado del juego
                const gameState = await get(ref(database, 'gameState'));
                if (!gameState.exists() || !gameState.val().gameActive) {
                    this.stop();
                    return;
                }
                
                // Verificar BINGO pendiente
                const pendingBingo = await get(ref(database, 'pendingBingoVerification'));
                if (pendingBingo.exists()) {
                    console.log('⏸️ BINGO pendiente, pausando cantado');
                    setTimeout(scheduleNextCall, 2000);
                    return;
                }
                
                // Verificar reinicio de Ronda 2
                const roundTwoReset = await get(ref(database, 'roundTwoReset'));
                if (roundTwoReset.exists() && roundTwoReset.val().reset) {
                    console.log('🔄 Reinicio de Ronda 2 detectado, deteniendo cantado');
                    this.stop();
                    return;
                }
                
                // Obtener números cantados
                const calledSnapshot = await get(ref(database, 'calledNumbers'));
                const currentNumbers = calledSnapshot.val() || [];
                
                // Generar siguiente número
                const availableNumbers = [];
                for (let i = 1; i <= 75; i++) {
                    if (!currentNumbers.includes(i)) {
                        availableNumbers.push(i);
                    }
                }
                
                if (availableNumbers.length === 0) {
                    console.log('✅ Todos los números cantados');
                    this.stop();
                    return;
                }
                
                const nextNumber = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
                const updatedNumbers = [...currentNumbers, nextNumber];
                
                // Actualizar Firebase
                await set(ref(database, 'calledNumbers'), updatedNumbers);
                
                // Actualizar estado del juego
                const currentState = gameState.val();
                await set(ref(database, 'gameState'), {
                    ...currentState,
                    lastNumber: nextNumber,
                    timestamp: Date.now()
                });
                
                console.log('📢 Número cantado independiente:', nextNumber, '- Total:', updatedNumbers.length);
                
                lastCallTime = Date.now();
                setTimeout(scheduleNextCall, CALL_INTERVAL);
                
            } catch (error) {
                console.error('❌ Error en cantado automático:', error);
                setTimeout(scheduleNextCall, 3000);
            }
        };
        
        // Iniciar cantado
        scheduleNextCall();
        this.scheduler = scheduleNextCall;
        
        // Sistema anti-pausa
        this.keepAlive = setInterval(() => {
            if (this.isRunning) {
                const now = Date.now();
                if (now - lastCallTime > 8000) { // 8 segundos sin actividad
                    console.log('🔄 Reactivando cantado automático');
                    scheduleNextCall();
                }
            }
        }, 2000);
    }

    stop() {
        this.isRunning = false;
        if (this.scheduler) {
            this.scheduler = null;
        }
        if (this.keepAlive) {
            clearInterval(this.keepAlive);
            this.keepAlive = null;
        }
        // Limpiar números cantados locales
        this.calledNumbers = [];
        console.log('🛑 Cantado automático independiente detenido');
    }
}

// Instancia global
window.autoCaller = new AutoCaller();

// Auto-iniciar cuando Firebase esté disponible
function initializeAutoCaller() {
    if (!window.firebase) {
        setTimeout(initializeAutoCaller, 1000);
        return;
    }
    
    const { database, ref, onValue } = window.firebase;
    
    onValue(ref(database, 'gameState'), (snapshot) => {
        const gameState = snapshot.val();
        if (gameState && gameState.gameActive && gameState.adminStarted) {
            // Detectar reinicio de Ronda 2
            if (gameState.roundTwoReset && gameState.currentRound === 2) {
                console.log('🔄 Detectado reinicio de Ronda 2 en auto-caller');
                window.autoCaller.stop();
                
                // Reiniciar cantado después de breve pausa
                setTimeout(() => {
                    console.log('🚀 Reiniciando cantado para Ronda 2 desde cero');
                    window.autoCaller.start(gameState.gameId || Date.now());
                }, 2000);
            } else if (!window.autoCaller.isRunning) {
                console.log('🚀 Iniciando cantado automático independiente');
                window.autoCaller.start(gameState.gameId || Date.now());
            }
        } else {
            window.autoCaller.stop();
        }
    });
}

// Inicializar cuando se cargue la página
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAutoCaller);
} else {
    initializeAutoCaller();
}