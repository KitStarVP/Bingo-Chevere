// Sistema de Cantado Ultra-Preciso
class UltraCaller {
    constructor(database) {
        this.database = database;
        this.isActive = false;
        this.mainInterval = null;
        this.lastCallTime = 0;
        this.CALL_INTERVAL = 15000; // 15 segundos
        this.instanceId = Date.now();
        this.callInProgress = false;
    }

    start() {
        if (this.isActive) {
            console.log(`⚠️ UltraCaller ya activo`);
            return;
        }
        
        this.isActive = true;
        this.lastCallTime = Date.now();
        
        console.log(`🚀 UltraCaller iniciado`);
        
        this.mainInterval = setInterval(() => {
            this.executeCall();
        }, this.CALL_INTERVAL);
        
        setTimeout(() => this.executeCall(), 1000);
    }

    async executeCall() {
        if (this.callInProgress || !this.isActive) return;
        
        this.callInProgress = true;
        
        try {
            if (!window.firebase) return;

            const { database, ref, get, set } = window.firebase;
            
            const gameStateSnap = await get(ref(database, 'gameState'));
            const gameState = gameStateSnap.val();
            
            if (!this.shouldContinue(gameState)) {
                this.stop();
                return;
            }

            const pendingSnap = await get(ref(database, 'pendingBingoVerification'));
            if (pendingSnap.exists()) {
                console.log('⏸️ BINGO pendiente');
                return;
            }

            const numbersSnap = await get(ref(database, 'calledNumbers'));
            const currentNumbers = numbersSnap.val() || [];

            if (currentNumbers.length >= 75) {
                console.log('✅ Todos cantados');
                this.stop();
                return;
            }

            const nextNumber = this.getNextNumber(currentNumbers);
            if (!nextNumber) return;

            const updatedNumbers = [...currentNumbers, nextNumber];
            await set(ref(database, 'calledNumbers'), updatedNumbers);
            
            await set(ref(database, 'gameState'), {
                ...gameState,
                lastNumber: nextNumber,
                lastCallTime: Date.now(),
                totalCalled: updatedNumbers.length
            });

            this.lastCallTime = Date.now();
            console.log(`📢 ${nextNumber} cantado (${updatedNumbers.length}/75)`);

        } catch (error) {
            console.error(`❌ Error:`, error);
        } finally {
            this.callInProgress = false;
        }
    }

    shouldContinue(gameState) {
        return gameState && 
               gameState.gameActive && 
               !gameState.gameFinalized;
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

    callNextNumber() {
        this.executeCall();
    }

    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.callInProgress = false;
        
        if (this.mainInterval) {
            clearInterval(this.mainInterval);
            this.mainInterval = null;
        }
        
        console.log(`🛑 UltraCaller detenido`);
    }
}

// Auto-inicialización
function initUltraCaller() {
    if (!window.firebase) {
        setTimeout(initUltraCaller, 1000);
        return;
    }

    const { database, ref, onValue } = window.firebase;
    
    onValue(ref(database, 'gameState'), (snapshot) => {
        const gameState = snapshot.val();
        
        if (gameState && gameState.gameActive && !gameState.gameFinalized) {
            if (window.ultraCaller && !window.ultraCaller.isActive) {
                console.log('🚀 Auto-iniciando UltraCaller');
                window.ultraCaller.start();
            }
        } else {
            if (window.ultraCaller && window.ultraCaller.isActive) {
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
