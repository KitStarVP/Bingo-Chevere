// Sistema de Cantado Automático - Profesional
class BingoCaller {
    constructor() {
        this.interval = null;
        this.isActive = false;
        this.CALL_INTERVAL = 15000; // 15 segundos
        this.callCount = 0;
        this.phrases = [
            'Vamos con el siguiente número',
            'Atención, sale el',
            'Siguiente número',
            'Tenemos el',
            'Ahora sale',
            'Continuamos con'
        ];
    }

    start() {
        if (this.isActive) {
            console.log('⚠️ Cantado ya está activo');
            return;
        }

        console.log('🎤 Iniciando cantado automático...');
        this.isActive = true;

        // Cantar primer número inmediatamente
        setTimeout(() => this.callNextNumber(), 2000);

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

            // 7. Anunciar con voz
            this.announceNumber(nextNumber);

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
        const letter = this.getBingoLetter(number);
        
        // Cada 3 números, agregar frase introductoria
        let text = '';
        if (this.callCount % 3 === 0 && this.callCount > 0) {
            const randomPhrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];
            text = `${randomPhrase}, ${letter} ${number}, repito, ${letter} ${number}`;
        } else {
            text = `${letter} ${number}, repito, ${letter} ${number}`;
        }
        
        this.callCount++;

        // Usar sistema de voz simple
        if (window.simpleVoice && window.simpleVoice.isReady) {
            try {
                console.log(`📢 Intentando anunciar: ${text}`);
                const success = await window.simpleVoice.announceNumber(number);
                if (success) {
                    console.log(`✅ Número anunciado exitosamente: ${text}`);
                } else {
                    console.warn(`⚠️ Fallo en sistema simple, usando fallback`);
                    this.fallbackToNativeVoice(text);
                }
            } catch (error) {
                console.error('❌ Error en sistema simple:', error);
                this.fallbackToNativeVoice(text);
            }
        } else {
            console.warn('⚠️ Sistema simple no disponible, usando fallback nativo');
            this.fallbackToNativeVoice(text);
        }
    }

    fallbackToNativeVoice(text) {
        if (!('speechSynthesis' in window)) {
            console.log('⚠️ Voz no soportada');
            return;
        }

        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.8;
        utterance.volume = 1;
        utterance.pitch = 1;

        // Esperar a que las voces se carguen
        const speak = () => {
            const voices = speechSynthesis.getVoices();
            const spanishVoice = voices.find(v => 
                v.lang === 'es-ES' || 
                v.lang === 'es-MX' || 
                v.lang.startsWith('es') ||
                v.name.toLowerCase().includes('spanish') ||
                v.name.toLowerCase().includes('español')
            );
            
            if (spanishVoice) {
                utterance.voice = spanishVoice;
            }

            utterance.onstart = () => console.log('🔊 Voz nativa iniciada:', text);
            utterance.onerror = (e) => console.error('❌ Error voz nativa:', e);
            utterance.onend = () => console.log('✅ Voz nativa completada');

            speechSynthesis.speak(utterance);
        };

        if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.addEventListener('voiceschanged', speak, { once: true });
            setTimeout(speak, 1000);
        } else {
            setTimeout(speak, 100);
        }
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
