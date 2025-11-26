// Sistema de Cantado Automático con Audio MP3
class BingoCaller {
    constructor() {
        this.interval = null;
        this.isActive = false;
        this.CALL_INTERVAL = 10000; // 10 segundos
        this.callCount = 0;
        this.gameStarted = false;
    }

    start() {
        if (this.isActive) {
            console.log('⚠️ Cantado ya está activo');
            return;
        }

        console.log('🎤 Iniciando cantado automático...');
        this.isActive = true;

        // Cantar primer número después de 8 segundos (para dar tiempo a secuencia de inicio)
        setTimeout(() => this.callNextNumber(), 8000);

        // Continuar cada 15 segundos
        this.interval = setInterval(() => {
            this.callNextNumber();
        }, this.CALL_INTERVAL);
    }

    stop() {
        if (!this.isActive) return;

        console.log('🛑 Deteniendo cantado...');
        this.isActive = false;

        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    async callNextNumber() {
        if (!this.isActive || !window.firebase) return;

        try {
            const { database, ref, get, set } = window.firebase;

            // 1. Verificar estado del juego
            const gameSnap = await get(ref(database, 'gameState'));
            const gameState = gameSnap.val();

            if (!gameState || !gameState.active || gameState.paused) {
                console.log('⏸️ Juego no activo o pausado');
                return;
            }

            // 2. Verificar si hay BINGO pendiente
            const alertsSnap = await get(ref(database, 'bingoAlerts'));
            const alerts = alertsSnap.val();

            if (alerts && Object.keys(alerts).length > 0) {
                console.log('⏸️ BINGO pendiente, pausando cantado...');
                return;
            }

            // 3. Obtener números cantados
            const numbersSnap = await get(ref(database, 'calledNumbers'));
            const calledNumbers = numbersSnap.val() || [];

            if (calledNumbers.length >= 75) {
                console.log('✅ Todos los números cantados');
                this.stop();
                return;
            }

            // 4. Generar número aleatorio no cantado
            const nextNumber = this.getRandomAvailableNumber(calledNumbers);

            if (!nextNumber) {
                console.log('❌ No hay números disponibles');
                return;
            }

            // 5. Guardar en Firebase
            const updatedNumbers = [...calledNumbers, nextNumber];
            await set(ref(database, 'calledNumbers'), updatedNumbers);

            // 6. Actualizar estado del juego
            await set(ref(database, 'gameState'), {
                ...gameState,
                lastNumber: nextNumber,
                lastCallTime: Date.now()
            });

            console.log(`📢 Número cantado: ${nextNumber} (${updatedNumbers.length}/75)`);

            // 7. Anunciar con audio MP3
            await this.announceNumber(nextNumber);

        } catch (error) {
            console.error('❌ Error cantando número:', error);
        }
    }

    getRandomAvailableNumber(calledNumbers) {
        const available = [];
        
        for (let i = 1; i <= 75; i++) {
            if (!calledNumbers.includes(i)) {
                available.push(i);
            }
        }

        if (available.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * available.length);
        return available[randomIndex];
    }

    async announceNumber(number) {
        this.callCount++;
        console.log(`📢 CANTANDO NÚMERO ${number}`);

        try {
            // Verificar que el sistema de audio esté disponible
            if (!window.audioSystem) {
                console.warn('⚠️ Sistema de audio no disponible, usando fallback...');
                this.fallbackAnnouncement(number);
                return;
            }

            // Si es el primer número, reproducir secuencia de inicio
            if (!this.gameStarted) {
                await window.audioSystem.playGameStart();
                this.gameStarted = true;
                await window.audioSystem.delay(5000); // 5 segundos de espera después de secuencia
            }

            // Reproducir frase de transición aleatoria (25% probabilidad)
            if (Math.random() < 0.25) {
                await window.audioSystem.playRandomTransition();
                await window.audioSystem.delay(1000);
            }

            // Anunciar el número
            const success = await window.audioSystem.announceNumber(number);
            
            if (!success) {
                console.warn('⚠️ Error reproduciendo audio, usando fallback...');
                this.fallbackAnnouncement(number);
            }

            // Reproducir frase de ambiente ocasionalmente (15% probabilidad)
            if (Math.random() < 0.15) {
                setTimeout(async () => {
                    await window.audioSystem.playRandomAmbient();
                }, 2000);
            }

        } catch (error) {
            console.error('❌ Error en announceNumber:', error);
            this.fallbackAnnouncement(number);
        }
    }

    fallbackAnnouncement(number) {
        console.log('🔔 Usando fallback visual para número:', number);
        
        const letter = this.getBingoLetter(number);
        const text = `${letter} ${number}`;
        
        // Mostrar notificación visual prominente
        this.showVisualNotification(text, 'number');
    }

    // Manejar eventos de BINGO
    async handleBingoCalled() {
        console.log('🎯 BINGO cantado, iniciando secuencia...');
        
        try {
            if (window.audioSystem) {
                await window.audioSystem.playBingoSequence();
            } else {
                this.showVisualNotification('¡BINGO CANTADO!', 'bingo');
            }
        } catch (error) {
            console.error('❌ Error en secuencia de BINGO:', error);
            this.showVisualNotification('¡BINGO CANTADO!', 'bingo');
        }
    }

    // Resultado de verificación de BINGO
    async handleBingoResult(isCorrect) {
        console.log('🎯 Resultado de BINGO:', isCorrect ? 'CORRECTO' : 'INCORRECTO');
        
        try {
            if (window.audioSystem) {
                await window.audioSystem.playBingoResult(isCorrect);
            } else {
                const message = isCorrect ? '¡BINGO CORRECTO!' : 'BINGO INCORRECTO, SEGUIMOS';
                this.showVisualNotification(message, isCorrect ? 'success' : 'warning');
            }
        } catch (error) {
            console.error('❌ Error reproduciendo resultado:', error);
            const message = isCorrect ? '¡BINGO CORRECTO!' : 'BINGO INCORRECTO, SEGUIMOS';
            this.showVisualNotification(message, isCorrect ? 'success' : 'warning');
        }
    }
    
    showVisualNotification(text, type = 'default') {
        console.log('📺 Mostrando notificación visual:', text);
        
        const colors = {
            'number': '#4CAF50',
            'bingo': '#FF9800', 
            'success': '#2196F3',
            'warning': '#FF5722',
            'default': '#6C63FF'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${colors[type] || colors.default};
            color: white;
            padding: 30px 40px;
            border-radius: 15px;
            font-size: 28px;
            font-weight: 900;
            z-index: 10000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            text-align: center;
            animation: pulse 0.5s ease-in-out;
        `;
        
        // Agregar animación CSS
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.1); }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        notification.textContent = text;
        document.body.appendChild(notification);
        
        // Remover después de 4 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.5s';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, 4000);
    }
    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }
}

// Exportar globalmente
window.BingoCaller = BingoCaller;
