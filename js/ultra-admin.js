// Sistema Ultra de Controles Admin - Cero Fallos
class UltraAdminControls {
    constructor() {
        this.gameState = 'inactive';
        this.currentRound = 1;
        this.numbersCount = 0;
        this.init();
    }

    init() {
        console.log('🎛️ Iniciando UltraAdminControls');
        this.bindEvents();
        this.startMonitoring();
        this.updateUI();
    }

    bindEvents() {
        // Botones ultra-inteligentes
        document.getElementById('ultra-start')?.addEventListener('click', () => this.startGame());
        document.getElementById('ultra-pause')?.addEventListener('click', () => this.pauseGame());
        document.getElementById('ultra-resume')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('ultra-next-round')?.addEventListener('click', () => this.nextRound());
        document.getElementById('ultra-finish')?.addEventListener('click', () => this.finishGame());
        document.getElementById('ultra-emergency')?.addEventListener('click', () => this.emergencyStop());
    }

    async startGame() {
        if (this.gameState !== 'inactive') return;

        try {
            const { database, ref, set } = window.firebase;
            
            // DETENER cualquier UltraCaller activo antes de iniciar
            if (window.ultraCaller && window.ultraCaller.isActive) {
                console.log('🛑 Deteniendo UltraCaller anterior antes de iniciar nuevo juego');
                window.ultraCaller.stop();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // LIMPIAR COMPLETAMENTE FIREBASE ANTES DE INICIAR
            await set(ref(database, 'calledNumbers'), []);
            await set(ref(database, 'pendingBingoVerification'), null);
            await set(ref(database, 'bingoVerificationResult'), null);
            await set(ref(database, 'roundTwoReset'), null);
            
            const gameState = {
                gameActive: true,
                currentRound: 1,
                adminStarted: true,
                startedAt: Date.now(),
                gameId: Date.now(),
                currentPattern: this.generateUniquePattern(),
                ultraCallerOnly: true,
                sessionCleared: true
            };

            await set(ref(database, 'gameState'), gameState);

            this.gameState = 'active';
            this.currentRound = 1;
            this.numbersCount = 0;
            
            this.updateUI();
            this.showSuccess('🚀 Juego iniciado - Firebase limpiado, solo UltraCaller activo');
            
        } catch (error) {
            this.showError('Error iniciando juego: ' + error.message);
        }
    }

    async pauseGame() {
        if (this.gameState !== 'active') return;

        try {
            const { database, ref, get, set } = window.firebase;
            const currentState = await get(ref(database, 'gameState'));
            
            await set(ref(database, 'gameState'), {
                ...currentState.val(),
                gameActive: false,
                isPaused: true,
                pausedAt: Date.now(),
                pauseReason: 'admin_pause'
            });

            this.gameState = 'paused';
            this.updateUI();
            this.showWarning('⏸️ Juego pausado');
            
        } catch (error) {
            this.showError('Error pausando juego: ' + error.message);
        }
    }

    async resumeGame() {
        if (this.gameState !== 'paused') return;

        try {
            const { database, ref, get, set } = window.firebase;
            const currentState = await get(ref(database, 'gameState'));
            
            await set(ref(database, 'gameState'), {
                ...currentState.val(),
                gameActive: true,
                isPaused: false,
                resumedAt: Date.now(),
                pauseReason: null
            });

            this.gameState = 'active';
            this.updateUI();
            this.showSuccess('▶️ Juego reanudado');
            
        } catch (error) {
            this.showError('Error reanudando juego: ' + error.message);
        }
    }

    async nextRound() {
        if (this.gameState !== 'active' || this.currentRound !== 1) return;

        try {
            const { database, ref, set } = window.firebase;
            
            // Reset completo para Ronda 2
            await set(ref(database, 'calledNumbers'), []);
            await set(ref(database, 'gameState'), {
                gameActive: true,
                currentRound: 2,
                roundTwoReset: true,
                resetTimestamp: Date.now(),
                adminControlled: true
            });

            // Resetear cartones
            await this.resetAllCardsForRound2();

            this.currentRound = 2;
            this.numbersCount = 0;
            this.updateUI();
            this.showSuccess('➡️ Ronda 2 iniciada desde cero');
            
        } catch (error) {
            this.showError('Error iniciando Ronda 2: ' + error.message);
        }
    }

    async finishGame() {
        if (this.gameState === 'inactive') return;

        if (!confirm('¿Finalizar juego completo? Los cartones expirarán.')) return;

        try {
            const { database, ref, set } = window.firebase;
            
            // DETENER UltraCaller PRIMERO
            if (window.ultraCaller && window.ultraCaller.isActive) {
                console.log('🛑 Deteniendo UltraCaller antes de finalizar');
                window.ultraCaller.stop();
            }
            
            // LIMPIAR COMPLETAMENTE FIREBASE PARA NUEVA SESIÓN
            await set(ref(database, 'calledNumbers'), []);
            await set(ref(database, 'pendingBingoVerification'), null);
            await set(ref(database, 'bingoVerificationResult'), null);
            await set(ref(database, 'roundTwoReset'), null);
            
            await set(ref(database, 'gameState'), {
                gameActive: false,
                gameFinalized: true,
                finalizedAt: Date.now(),
                finalizedBy: 'admin',
                ultraCallerStopped: true,
                sessionCleared: true
            });

            // Expirar cartones
            await this.expireAllCards();

            this.gameState = 'inactive';
            this.currentRound = 1;
            this.numbersCount = 0;
            this.updateUI();
            this.showSuccess('🏁 Juego finalizado - Firebase limpiado para nueva sesión');
            
        } catch (error) {
            this.showError('Error finalizando juego: ' + error.message);
        }
    }

    async emergencyStop() {
        if (!confirm('⚠️ PARADA DE EMERGENCIA\n\n¿Detener todo inmediatamente?')) return;

        try {
            // DETENER UltraCaller INMEDIATAMENTE
            if (window.ultraCaller) {
                console.log('🛑 EMERGENCIA - Deteniendo UltraCaller');
                window.ultraCaller.stop();
            }
            
            const { database, ref, set } = window.firebase;
            
            // LIMPIAR FIREBASE EN EMERGENCIA
            await set(ref(database, 'calledNumbers'), []);
            await set(ref(database, 'pendingBingoVerification'), null);
            
            await set(ref(database, 'gameState'), {
                gameActive: false,
                emergencyStop: true,
                emergencyAt: Date.now(),
                ultraCallerForceStop: true,
                sessionCleared: true
            });

            this.gameState = 'inactive';
            this.updateUI();
            this.showError('🛑 EMERGENCIA - Todo detenido y Firebase limpiado');
            
        } catch (error) {
            this.showError('Error en parada de emergencia: ' + error.message);
        }
    }

    startMonitoring() {
        if (!window.firebase) {
            setTimeout(() => this.startMonitoring(), 1000);
            return;
        }

        const { database, ref, onValue } = window.firebase;
        
        // Monitorear estado del juego
        onValue(ref(database, 'gameState'), (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                if (gameState.gameActive) {
                    this.gameState = 'active';
                } else if (gameState.isPaused) {
                    this.gameState = 'paused';
                } else {
                    this.gameState = 'inactive';
                }
                
                this.currentRound = gameState.currentRound || 1;
                this.updateUI();
            }
        });

        // Monitorear números cantados
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            const numbers = snapshot.val();
            this.numbersCount = numbers ? numbers.length : 0;
            
            // Actualizar último número
            if (numbers && numbers.length > 0) {
                const lastNumber = numbers[numbers.length - 1];
                const letter = this.getBingoLetter(lastNumber);
                document.getElementById('last-number-admin').textContent = `${letter}${lastNumber}`;
            }
            
            this.updateUI();
        });

        // Monitorear UltraCaller
        setInterval(() => {
            const callerStatus = document.getElementById('caller-status');
            if (window.ultraCaller && callerStatus) {
                const status = window.ultraCaller.getStatus();
                if (status.active) {
                    callerStatus.textContent = '🟢 Activo';
                    callerStatus.style.color = '#28a745';
                } else {
                    callerStatus.textContent = '🔴 Detenido';
                    callerStatus.style.color = '#dc3545';
                }
            }
        }, 2000);
    }

    updateUI() {
        // Actualizar indicador de estado
        const statusEl = document.getElementById('ultra-status');
        const roundEl = document.getElementById('ultra-round');
        const numbersEl = document.getElementById('ultra-numbers');

        if (statusEl) {
            switch (this.gameState) {
                case 'active':
                    statusEl.textContent = '🟢 ACTIVO';
                    statusEl.className = 'status-indicator active';
                    break;
                case 'paused':
                    statusEl.textContent = '🟡 PAUSADO';
                    statusEl.className = 'status-indicator paused';
                    break;
                default:
                    statusEl.textContent = '🔴 INACTIVO';
                    statusEl.className = 'status-indicator inactive';
            }
        }

        if (roundEl) roundEl.textContent = this.currentRound;
        if (numbersEl) numbersEl.textContent = this.numbersCount;

        // Actualizar botones inteligentemente
        this.updateButtons();
    }

    updateButtons() {
        const buttons = {
            start: document.getElementById('ultra-start'),
            pause: document.getElementById('ultra-pause'),
            resume: document.getElementById('ultra-resume'),
            nextRound: document.getElementById('ultra-next-round'),
            finish: document.getElementById('ultra-finish')
        };

        // Resetear todos
        Object.values(buttons).forEach(btn => {
            if (btn) btn.disabled = true;
        });

        // Habilitar según estado
        switch (this.gameState) {
            case 'inactive':
                if (buttons.start) buttons.start.disabled = false;
                break;
            case 'active':
                if (buttons.pause) buttons.pause.disabled = false;
                if (buttons.finish) buttons.finish.disabled = false;
                if (this.currentRound === 1 && buttons.nextRound) {
                    buttons.nextRound.disabled = false;
                }
                break;
            case 'paused':
                if (buttons.resume) buttons.resume.disabled = false;
                if (buttons.finish) buttons.finish.disabled = false;
                break;
        }
    }

    // Funciones auxiliares
    generateUniquePattern() {
        const positions = [];
        const numPositions = 8 + Math.floor(Math.random() * 5);
        const available = [];
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (!(row === 2 && col === 2)) {
                    available.push([row, col]);
                }
            }
        }
        
        for (let i = 0; i < numPositions && available.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * available.length);
            positions.push(available.splice(randomIndex, 1)[0]);
        }
        
        return {
            name: `Patrón ${Date.now()}`,
            positions: positions
        };
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    async resetAllCardsForRound2() {
        console.log('🔄 Reseteando cartones para Ronda 2');
        
        if (!window.firebase) {
            console.error('❌ Firebase no disponible para resetear cartones');
            return;
        }
        
        try {
            const { database, ref, get, set } = window.firebase;
            
            // Obtener todos los cartones de jugadores
            const snapshot = await get(ref(database, 'playerCards'));
            const allPlayerCards = snapshot.val();
            
            if (!allPlayerCards) {
                console.log('No hay cartones para resetear');
                return;
            }
            
            let cardsReset = 0;
            
            // Resetear cartones de cada jugador
            for (const phone of Object.keys(allPlayerCards)) {
                const playerCards = allPlayerCards[phone];
                
                if (Array.isArray(playerCards)) {
                    let hasChanges = false;
                    
                    playerCards.forEach(card => {
                        if (card.status === 'en_uso' || card.status === 'vigente') {
                            // Resetear marcas del cartón pero mantenerlo vigente
                            card.marked = ['2-2']; // Solo FREE marcado
                            card.roundTwoReset = true;
                            card.resetTimestamp = Date.now();
                            hasChanges = true;
                            cardsReset++;
                        }
                    });
                    
                    if (hasChanges) {
                        await set(ref(database, `playerCards/${phone}`), playerCards);
                    }
                }
            }
            
            console.log(`✅ ${cardsReset} cartones reseteados para Ronda 2`);
        } catch (error) {
            console.error('❌ Error reseteando cartones:', error);
        }
    }

    async expireAllCards() {
        console.log('⏰ Expirando todos los cartones');
        
        if (!window.firebase) {
            console.error('❌ Firebase no disponible para expirar cartones');
            return;
        }
        
        try {
            const { database, ref, get, set } = window.firebase;
            
            // Obtener todos los cartones de jugadores
            const snapshot = await get(ref(database, 'playerCards'));
            const allPlayerCards = snapshot.val();
            
            if (!allPlayerCards) {
                console.log('No hay cartones para expirar');
                return;
            }
            
            let cardsExpired = 0;
            
            // Expirar cartones de cada jugador
            for (const phone of Object.keys(allPlayerCards)) {
                const playerCards = allPlayerCards[phone];
                
                if (Array.isArray(playerCards)) {
                    let hasChanges = false;
                    
                    playerCards.forEach(card => {
                        if (card.status === 'en_uso' || card.status === 'vigente' || card.status === 'pendiente_pago') {
                            // Mover cartón a vencido
                            card.status = 'vencido';
                            card.expiredDate = new Date().toISOString();
                            card.expiredReason = 'Juego finalizado por admin';
                            card.expiredBy = 'admin';
                            card.expiredTimestamp = Date.now();
                            hasChanges = true;
                            cardsExpired++;
                        }
                    });
                    
                    if (hasChanges) {
                        await set(ref(database, `playerCards/${phone}`), playerCards);
                    }
                }
            }
            
            console.log(`✅ ${cardsExpired} cartones movidos a vencidos`);
        } catch (error) {
            console.error('❌ Error expirando cartones:', error);
        }
    }

    // Mensajes de feedback
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showWarning(message) {
        this.showMessage(message, 'warning');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Usar el sistema de popups existente
        if (window.showAdminPopup) {
            window.showAdminPopup('Sistema Ultra', message, type);
        } else {
            alert(message);
        }
    }
}

// Función global para inicializar
function initUltraControls() {
    if (window.ultraAdminControls) return;
    
    // Esperar a Firebase
    if (!window.firebase) {
        setTimeout(initUltraControls, 1000);
        return;
    }
    
    window.ultraAdminControls = new UltraAdminControls();
    console.log('✅ UltraAdminControls inicializado');
}

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUltraControls);
} else {
    initUltraControls();
}