// Sistema de Cantado con Heartbeat Distribuido
class UltraCaller {
    constructor(database) {
        this.database = database;
        this.isActive = false;
        this.mainInterval = null;
        this.heartbeatInterval = null;
        this.lastCallTime = 0;
        this.CALL_INTERVAL = 15000; // 15 segundos
        this.HEARTBEAT_INTERVAL = 5000; // 5 segundos
        this.HEARTBEAT_TIMEOUT = 10000; // 10 segundos
        this.instanceId = `${Date.now()}-${Math.random()}`;
        this.isAdmin = false;
        this.callInProgress = false;
        this.isCaller = false;
    }

    start(isAdmin = false) {
        if (this.isActive) {
            console.log('⚠️ UltraCaller ya está activo');
            return;
        }
        
        this.isAdmin = isAdmin;
        console.log(`🎤 UltraCaller iniciado - Tipo: ${isAdmin ? 'ADMIN' : 'JUGADOR'}`);
        this.isActive = true;
        
        // Intentar convertirse en caller
        this.tryBecomeCaller();
        
        // Monitorear heartbeat cada 5 segundos
        this.heartbeatInterval = setInterval(() => {
            this.monitorHeartbeat();
        }, this.HEARTBEAT_INTERVAL);
    }

    async tryBecomeCaller() {
        if (!window.firebase) return;
        
        try {
            const { database, ref, get, set } = window.firebase;
            const callerSnap = await get(ref(database, 'callerHeartbeat'));
            const caller = callerSnap.val();
            const now = Date.now();
            
            // Si no hay caller o el caller está muerto
            if (!caller || (now - caller.lastBeat) > this.HEARTBEAT_TIMEOUT) {
                // Admin tiene prioridad
                if (!caller || this.isAdmin || !caller.isAdmin) {
                    await set(ref(database, 'callerHeartbeat'), {
                        instanceId: this.instanceId,
                        isAdmin: this.isAdmin,
                        lastBeat: now,
                        startedAt: now
                    });
                    
                    this.isCaller = true;
                    console.log(`👑 Soy el CALLER activo (${this.isAdmin ? 'ADMIN' : 'JUGADOR'})`);
                    
                    // Iniciar cantado
                    this.startCalling();
                }
            }
        } catch (error) {
            console.error('Error intentando ser caller:', error);
        }
    }
    
    async monitorHeartbeat() {
        if (!window.firebase || !this.isActive) return;
        
        try {
            const { database, ref, get, set } = window.firebase;
            const callerSnap = await get(ref(database, 'callerHeartbeat'));
            const caller = callerSnap.val();
            const now = Date.now();
            
            if (this.isCaller) {
                // Actualizar mi heartbeat
                await set(ref(database, 'callerHeartbeat'), {
                    instanceId: this.instanceId,
                    isAdmin: this.isAdmin,
                    lastBeat: now,
                    startedAt: caller?.startedAt || now
                });
                console.log('💓 Heartbeat actualizado');
            } else {
                // Verificar si puedo convertirme en caller
                if (!caller || (now - caller.lastBeat) > this.HEARTBEAT_TIMEOUT) {
                    console.log('🔄 Caller anterior murió, intentando tomar control...');
                    await this.tryBecomeCaller();
                } else if (this.isAdmin && !caller.isAdmin) {
                    // Admin recupera control de jugador
                    console.log('👑 Admin recuperando control...');
                    await this.tryBecomeCaller();
                }
            }
        } catch (error) {
            console.error('Error en heartbeat:', error);
        }
    }
    
    startCalling() {
        if (this.mainInterval) return;
        
        // Cantar primer número inmediatamente
        setTimeout(() => this.executeCall(), 1000);
        
        // Continuar cada 15 segundos
        this.mainInterval = setInterval(() => {
            this.executeCall();
        }, this.CALL_INTERVAL);
    }
    
    stopCalling() {
        if (this.mainInterval) {
            clearInterval(this.mainInterval);
            this.mainInterval = null;
        }
    }
    
    async executeCall() {
        if (this.callInProgress || !this.isActive || !this.isCaller) return;
        
        this.callInProgress = true;
        
        try {
            if (!window.firebase) return;

            const { database, ref, get, set } = window.firebase;
            
            const gameStateSnap = await get(ref(database, 'gameState'));
            const gameState = gameStateSnap.val();
            
            if (!this.shouldContinue(gameState)) {
                console.log('⏹️ Juego no activo');
                this.stopCalling();
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
                console.log('✅ Todos los números cantados');
                this.stopCalling();
                return;
            }

            const nextNumber = this.getNextNumber(currentNumbers);
            if (!nextNumber) return;

            const now = Date.now();
            const numberData = {
                number: nextNumber,
                timestamp: now,
                calledBy: this.instanceId,
                isAdmin: this.isAdmin
            };
            
            const updatedNumbers = [...currentNumbers, numberData];
            await set(ref(database, 'calledNumbers'), updatedNumbers);
            
            await set(ref(database, 'gameState'), {
                ...gameState,
                lastNumber: nextNumber,
                lastCallTime: now,
                totalCalled: updatedNumbers.length
            });

            console.log(`📢 Número cantado: ${nextNumber} (${updatedNumbers.length}/75)`);

        } catch (error) {
            console.error('❌ Error cantando:', error);
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
        const calledNums = currentNumbers.map(n => typeof n === 'object' ? n.number : n);
        const available = [];
        for (let i = 1; i <= 75; i++) {
            if (!calledNums.includes(i)) {
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
        
        console.log('🛑 UltraCaller detenido');
        this.isActive = false;
        this.isCaller = false;
        this.callInProgress = false;
        
        this.stopCalling();
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Limpiar heartbeat si soy caller
        if (window.firebase) {
            const { database, ref, set } = window.firebase;
            set(ref(database, 'callerHeartbeat'), null).catch(() => {});
        }
    }
}

// Exportar clase globalmente
window.UltraCaller = UltraCaller;
