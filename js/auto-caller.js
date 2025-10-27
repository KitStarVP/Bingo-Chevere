// Sistema de Cantado Automático Independiente
class AutoCaller {
    constructor() {
        this.isRunning = false;
        this.calledNumbers = [];
        this.gameId = null;
        this.interval = null;
    }

    async start(gameId) {
        if (this.isRunning) return;
        
        this.gameId = gameId;
        this.isRunning = true;
        this.calledNumbers = [];
        
        console.log('🎯 Iniciando cantado automático para juego:', gameId);
        
        // Cantado cada 6 segundos
        this.interval = setInterval(() => {
            this.callNextNumber();
        }, 6000);
    }

    async callNextNumber() {
        if (!window.firebase || !this.isRunning) return;
        
        const { database, ref, get, set } = window.firebase;
        
        try {
            // Verificar si el juego sigue activo
            const gameState = await get(ref(database, 'gameState'));
            if (!gameState.exists() || !gameState.val().gameActive) {
                this.stop();
                return;
            }
            
            // Verificar si hay BINGO pendiente
            const pendingBingo = await get(ref(database, 'pendingBingoVerification'));
            if (pendingBingo.exists()) {
                console.log('⏸️ BINGO pendiente, pausando cantado');
                return;
            }
            
            // Obtener números ya cantados
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
            
            // Enviar a Firebase
            await set(ref(database, 'calledNumbers'), updatedNumbers);
            
            console.log('📢 Número cantado:', nextNumber, '- Total:', updatedNumbers.length);
            
        } catch (error) {
            console.error('❌ Error en cantado automático:', error);
        }
    }

    stop() {
        this.isRunning = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        console.log('🛑 Cantado automático detenido');
    }
}

// Instancia global
window.autoCaller = new AutoCaller();

// Auto-iniciar si hay juego activo
if (window.firebase) {
    const { database, ref, onValue } = window.firebase;
    
    onValue(ref(database, 'gameState'), (snapshot) => {
        const gameState = snapshot.val();
        if (gameState && gameState.gameActive && gameState.adminStarted) {
            if (!window.autoCaller.isRunning) {
                window.autoCaller.start(gameState.gameId || Date.now());
            }
        } else {
            window.autoCaller.stop();
        }
    });
}