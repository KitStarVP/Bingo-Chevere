// Sistema de Voz Híbrido Universal - Compatible con todos los dispositivos
class UniversalVoiceSystem {
    constructor() {
        this.isInitialized = false;
        this.currentMethod = null;
        this.fallbackMethods = [];
        this.voiceQueue = [];
        this.isPlaying = false;
        this.selectedVoice = null;
        this.init();
    }

    async init() {
        console.log('🎤 Inicializando sistema de voz universal...');
        
        // Detectar dispositivo y navegador
        this.detectEnvironment();
        
        // Configurar métodos disponibles en orden de prioridad
        await this.setupVoiceMethods();
        
        // Cargar voces nativas
        this.loadNativeVoices();
        
        this.isInitialized = true;
        console.log(`✅ Sistema de voz listo. Método principal: ${this.currentMethod}`);
    }

    detectEnvironment() {
        const ua = navigator.userAgent.toLowerCase();
        
        this.environment = {
            isIOS: /iphone|ipad|ipod/.test(ua),
            isAndroid: /android/.test(ua),
            isSafari: /safari/.test(ua) && !/chrome/.test(ua),
            isChrome: /chrome/.test(ua),
            isFirefox: /firefox/.test(ua),
            isMobile: /mobile|tablet|android|iphone|ipad/.test(ua),
            supportsWebSpeech: 'speechSynthesis' in window,
            supportsAudioContext: 'AudioContext' in window || 'webkitAudioContext' in window
        };

        console.log('🔍 Entorno detectado:', this.environment);
    }

    async setupVoiceMethods() {
        this.fallbackMethods = [];

        // Método 1: ResponsiveVoice (si está disponible)
        if (typeof responsiveVoice !== 'undefined' && responsiveVoice.voiceSupport()) {
            this.fallbackMethods.push('responsiveVoice');
            console.log('✅ ResponsiveVoice disponible');
        }

        // Método 2: Web Speech API nativa
        if (this.environment.supportsWebSpeech) {
            this.fallbackMethods.push('webSpeech');
            console.log('✅ Web Speech API disponible');
        }

        // Método 3: Audio HTML5 con TTS online
        if (this.environment.supportsAudioContext) {
            this.fallbackMethods.push('audioHTML5');
            console.log('✅ Audio HTML5 disponible');
        }

        // Método 4: Fallback silencioso
        this.fallbackMethods.push('silent');

        // Establecer método principal
        this.currentMethod = this.fallbackMethods[0] || 'silent';
    }

    loadNativeVoices() {
        if (!this.environment.supportsWebSpeech) return;

        const loadVoices = () => {
            const voices = speechSynthesis.getVoices();
            
            // Buscar voces en español
            const spanishVoices = voices.filter(voice => 
                voice.lang.startsWith('es') || 
                voice.name.toLowerCase().includes('spanish') ||
                voice.name.toLowerCase().includes('español')
            );

            if (spanishVoices.length > 0) {
                // Priorizar voces femeninas
                this.selectedVoice = spanishVoices.find(v => 
                    v.name.toLowerCase().includes('female') ||
                    v.name.toLowerCase().includes('mujer') ||
                    v.name.toLowerCase().includes('maria') ||
                    v.name.toLowerCase().includes('carmen')
                ) || spanishVoices[0];

                console.log(`🎯 Voz seleccionada: ${this.selectedVoice.name} (${this.selectedVoice.lang})`);
            }
        };

        // Cargar voces cuando estén disponibles
        if (speechSynthesis.getVoices().length > 0) {
            loadVoices();
        } else {
            speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
            // Timeout de seguridad
            setTimeout(loadVoices, 1000);
        }
    }

    async speak(text, options = {}) {
        if (!this.isInitialized) {
            console.warn('⚠️ Sistema de voz no inicializado');
            return false;
        }

        const config = {
            rate: options.rate || 0.85,
            pitch: options.pitch || 1,
            volume: options.volume || 1,
            lang: options.lang || 'es-ES',
            priority: options.priority || 'normal',
            ...options
        };

        // Si hay alta prioridad, limpiar cola
        if (config.priority === 'high') {
            this.clearQueue();
        }

        // Agregar a cola
        this.voiceQueue.push({ text, config });

        // Procesar cola si no está reproduciendo
        if (!this.isPlaying) {
            return this.processQueue();
        }

        return true;
    }

    async processQueue() {
        if (this.voiceQueue.length === 0 || this.isPlaying) return;

        this.isPlaying = true;
        const { text, config } = this.voiceQueue.shift();

        console.log(`🔊 Reproduciendo: "${text}" con método ${this.currentMethod}`);

        let success = false;

        // Intentar con método actual
        for (const method of this.fallbackMethods) {
            try {
                success = await this.speakWithMethod(text, config, method);
                if (success) {
                    this.currentMethod = method;
                    break;
                }
            } catch (error) {
                console.warn(`⚠️ Método ${method} falló:`, error);
                continue;
            }
        }

        if (!success) {
            console.error('❌ Todos los métodos de voz fallaron');
        }

        this.isPlaying = false;

        // Procesar siguiente en cola
        if (this.voiceQueue.length > 0) {
            setTimeout(() => this.processQueue(), 100);
        }

        return success;
    }

    async speakWithMethod(text, config, method) {
        switch (method) {
            case 'responsiveVoice':
                return this.speakWithResponsiveVoice(text, config);
            
            case 'webSpeech':
                return this.speakWithWebSpeech(text, config);
            
            case 'audioHTML5':
                return this.speakWithAudioHTML5(text, config);
            
            case 'silent':
                return this.speakSilent(text, config);
            
            default:
                return false;
        }
    }

    speakWithResponsiveVoice(text, config) {
        return new Promise((resolve) => {
            if (typeof responsiveVoice === 'undefined' || !responsiveVoice.voiceSupport()) {
                resolve(false);
                return;
            }

            responsiveVoice.cancel();

            const voice = this.environment.isIOS ? "Spanish Latin American Female" : 
                         this.environment.isAndroid ? "Spanish Female" : 
                         "Spanish Latin American Female";

            responsiveVoice.speak(text, voice, {
                rate: config.rate,
                pitch: config.pitch,
                volume: config.volume,
                onstart: () => {
                    console.log('🎤 ResponsiveVoice iniciado');
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
            setTimeout(() => resolve(false), 10000);
        });
    }

    speakWithWebSpeech(text, config) {
        return new Promise((resolve) => {
            if (!this.environment.supportsWebSpeech) {
                resolve(false);
                return;
            }

            speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = config.lang;
            utterance.rate = config.rate;
            utterance.volume = config.volume;
            utterance.pitch = config.pitch;

            if (this.selectedVoice) {
                utterance.voice = this.selectedVoice;
            }

            utterance.onstart = () => {
                console.log('🎤 Web Speech iniciado');
            };

            utterance.onend = () => {
                console.log('✅ Web Speech completado');
                resolve(true);
            };

            utterance.onerror = (event) => {
                console.error('❌ Web Speech error:', event.error);
                resolve(false);
            };

            // Workaround para Safari iOS
            if (this.environment.isIOS && this.environment.isSafari) {
                setTimeout(() => {
                    speechSynthesis.speak(utterance);
                }, 100);
            } else {
                speechSynthesis.speak(utterance);
            }

            // Timeout de seguridad
            setTimeout(() => {
                speechSynthesis.cancel();
                resolve(false);
            }, 15000);
        });
    }

    async speakWithAudioHTML5(text, config) {
        // Implementación con Google TTS gratuito
        return new Promise((resolve) => {
            try {
                const encodedText = encodeURIComponent(text);
                const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodedText}`;
                
                const audio = new Audio(audioUrl);
                audio.volume = config.volume;
                audio.playbackRate = config.rate;

                audio.onloadstart = () => {
                    console.log('🎤 Audio HTML5 cargando...');
                };

                audio.onplay = () => {
                    console.log('🎤 Audio HTML5 iniciado');
                };

                audio.onended = () => {
                    console.log('✅ Audio HTML5 completado');
                    resolve(true);
                };

                audio.onerror = (e) => {
                    console.error('❌ Audio HTML5 error:', e);
                    resolve(false);
                };

                audio.play().catch(e => {
                    console.error('❌ Audio HTML5 play error:', e);
                    resolve(false);
                });

                // Timeout de seguridad
                setTimeout(() => {
                    audio.pause();
                    resolve(false);
                }, 10000);

            } catch (error) {
                console.error('❌ Audio HTML5 setup error:', error);
                resolve(false);
            }
        });
    }

    speakSilent(text, config) {
        console.log(`🔇 Modo silencioso: "${text}"`);
        return Promise.resolve(true);
    }

    // Métodos de control
    stop() {
        this.clearQueue();
        this.isPlaying = false;

        // Detener todos los métodos
        if (typeof responsiveVoice !== 'undefined') {
            responsiveVoice.cancel();
        }

        if (this.environment.supportsWebSpeech) {
            speechSynthesis.cancel();
        }

        console.log('⏹️ Voz detenida');
    }

    pause() {
        if (typeof responsiveVoice !== 'undefined') {
            responsiveVoice.pause();
        }

        if (this.environment.supportsWebSpeech) {
            speechSynthesis.pause();
        }

        console.log('⏸️ Voz pausada');
    }

    resume() {
        if (typeof responsiveVoice !== 'undefined') {
            responsiveVoice.resume();
        }

        if (this.environment.supportsWebSpeech) {
            speechSynthesis.resume();
        }

        console.log('▶️ Voz reanudada');
    }

    clearQueue() {
        this.voiceQueue = [];
    }

    // Método específico para números de bingo
    async announceNumber(number) {
        const letter = this.getBingoLetter(number);
        const text = `${letter} ${number}, repito, ${letter} ${number}`;
        
        return this.speak(text, {
            priority: 'high',
            rate: 0.8,
            volume: 1
        });
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    // Método para activar audio en dispositivos que lo requieren
    async activateAudio() {
        if (this.environment.isIOS || this.environment.isSafari) {
            // Reproducir sonido silencioso para activar audio
            try {
                if (typeof responsiveVoice !== 'undefined') {
                    responsiveVoice.speak('', 'Spanish Female', { volume: 0 });
                }

                if (this.environment.supportsWebSpeech) {
                    const utterance = new SpeechSynthesisUtterance('');
                    utterance.volume = 0;
                    speechSynthesis.speak(utterance);
                }

                console.log('🔊 Audio activado para iOS/Safari');
                return true;
            } catch (error) {
                console.warn('⚠️ No se pudo activar audio:', error);
                return false;
            }
        }
        return true;
    }

    // Información del sistema
    getSystemInfo() {
        return {
            environment: this.environment,
            currentMethod: this.currentMethod,
            availableMethods: this.fallbackMethods,
            selectedVoice: this.selectedVoice?.name || 'Ninguna',
            queueLength: this.voiceQueue.length,
            isPlaying: this.isPlaying,
            isInitialized: this.isInitialized
        };
    }
}

// Exportar globalmente
window.UniversalVoiceSystem = UniversalVoiceSystem;

// Auto-inicializar si no existe
if (!window.voiceSystem) {
    window.voiceSystem = new UniversalVoiceSystem();
}