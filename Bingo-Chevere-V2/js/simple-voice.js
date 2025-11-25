// Sistema de Voz Simple y Robusto
class SimpleVoiceSystem {
    constructor() {
        this.isReady = false;
        this.init();
    }

    init() {
        console.log('🎤 Inicializando sistema de voz simple...');
        
        // Esperar un poco para que todo se cargue
        setTimeout(() => {
            this.isReady = true;
            console.log('✅ Sistema de voz simple listo');
            this.testVoice();
        }, 1000);
    }

    testVoice() {
        console.log('🧪 Probando sistema de voz...');
        
        // Test ResponsiveVoice
        if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
            console.log('✅ ResponsiveVoice disponible');
        } else {
            console.log('❌ ResponsiveVoice NO disponible');
        }
        
        // Test Web Speech
        if ('speechSynthesis' in window) {
            console.log('✅ Web Speech API disponible');
        } else {
            console.log('❌ Web Speech API NO disponible');
        }
    }

    async speak(text) {
        if (!this.isReady) {
            console.warn('⚠️ Sistema de voz no está listo');
            return false;
        }

        console.log(`🔊 Intentando decir: "${text}"`);

        // Método 1: ResponsiveVoice
        if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
            return this.speakWithResponsiveVoice(text);
        }

        // Método 2: Web Speech API
        if ('speechSynthesis' in window) {
            return this.speakWithWebSpeech(text);
        }

        console.error('❌ No hay métodos de voz disponibles');
        return false;
    }

    speakWithResponsiveVoice(text) {
        return new Promise((resolve) => {
            console.log('🎤 Usando ResponsiveVoice...');
            
            responsiveVoice.cancel();
            
            responsiveVoice.speak(text, "Spanish Latin American Female", {
                rate: 0.8,
                pitch: 1,
                volume: 1,
                onstart: () => {
                    console.log('✅ ResponsiveVoice iniciado');
                },
                onend: () => {
                    console.log('✅ ResponsiveVoice completado');
                    resolve(true);
                },
                onerror: (e) => {
                    console.error('❌ ResponsiveVoice error:', e);
                    resolve(false);
                }
            });

            // Timeout de seguridad
            setTimeout(() => {
                console.warn('⏰ ResponsiveVoice timeout');
                resolve(false);
            }, 8000);
        });
    }

    speakWithWebSpeech(text) {
        return new Promise((resolve) => {
            console.log('🎤 Usando Web Speech API...');
            
            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            utterance.rate = 0.8;
            utterance.volume = 1;
            utterance.pitch = 1;

            // Buscar voz en español
            const voices = speechSynthesis.getVoices();
            const spanishVoice = voices.find(v => 
                v.lang.startsWith('es') || 
                v.name.toLowerCase().includes('spanish')
            );
            
            if (spanishVoice) {
                utterance.voice = spanishVoice;
                console.log(`🎯 Usando voz: ${spanishVoice.name}`);
            }

            utterance.onstart = () => {
                console.log('✅ Web Speech iniciado');
            };

            utterance.onend = () => {
                console.log('✅ Web Speech completado');
                resolve(true);
            };

            utterance.onerror = (event) => {
                console.error('❌ Web Speech error:', event.error);
                resolve(false);
            };

            speechSynthesis.speak(utterance);

            // Timeout de seguridad
            setTimeout(() => {
                speechSynthesis.cancel();
                console.warn('⏰ Web Speech timeout');
                resolve(false);
            }, 8000);
        });
    }

    // Método específico para números de bingo
    async announceNumber(number) {
        const letter = this.getBingoLetter(number);
        const text = `${letter} ${number}, repito, ${letter} ${number}`;
        
        console.log(`📢 Anunciando número: ${text}`);
        return this.speak(text);
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    stop() {
        if (typeof responsiveVoice !== 'undefined') {
            responsiveVoice.cancel();
        }
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        console.log('⏹️ Voz detenida');
    }
}

// Inicializar sistema simple
window.simpleVoice = new SimpleVoiceSystem();