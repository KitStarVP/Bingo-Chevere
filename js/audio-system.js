// Sistema de Audio Cache Progresivo - Ultra Rápido
class AudioSystem {
    constructor() {
        console.log('🔄 Iniciando constructor AudioSystem...');
        
        try {
            this.audioCache = new Map();
            this.preloadQueue = [];
            this.isInitialized = false;
            this.baseUrl = 'audio/';
            
            // Sistema de cola de audio
            this.audioQueue = [];
            this.isPlayingSequence = false;
            this.currentAudio = null;
            
            // Configuración de compatibilidad
            this.isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            
            console.log('✅ AudioSystem propiedades inicializadas', { 
                isMobile: this.isMobile, 
                isIOS: this.isIOS,
                baseUrl: this.baseUrl
            });
            
            // Pre-cargar audios críticos en background
            this.preloadCriticalAudios();
            
            console.log('✅ Constructor AudioSystem completado');
        } catch (error) {
            console.error('❌ Error en constructor AudioSystem:', error);
            throw error;
        }
    }

    // Pre-cargar solo los audios más importantes
    async preloadCriticalAudios() {
        try {
            const criticalAudios = [
                'bienvenidos-bingo.mp3',
                'han-cantado-bingo.mp3',
                'verificando-ganador.mp3',
                'bingo-correcto.mp3',
                'bingo-incorrecto.mp3'
            ];

            console.log('🚀 Pre-cargando audios críticos...', criticalAudios);
            
            // No esperar a que terminen, hacerlo en background
            setTimeout(async () => {
                for (const filename of criticalAudios) {
                    try {
                        await this.loadAudio(filename, true);
                        console.log(`✅ Pre-cargado: ${filename}`);
                    } catch (error) {
                        console.warn(`⚠️ No se pudo pre-cargar: ${filename}`, error);
                    }
                }
                console.log('✅ Proceso de pre-carga completado');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error en preloadCriticalAudios:', error);
        }
    }

    // Cargar audio con cache inteligente
    async loadAudio(filename, isPreload = false) {
        // Si ya está en cache, retornar inmediatamente
        if (this.audioCache.has(filename)) {
            return this.audioCache.get(filename);
        }

        try {
            const audio = new Audio();
            
            // Configuración para máxima compatibilidad
            audio.preload = isPreload ? 'auto' : 'metadata';
            audio.volume = 1.0;
            
            // Promesa para manejar la carga
            const loadPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout cargando audio'));
                }, 5000);

                audio.oncanplaythrough = () => {
                    clearTimeout(timeout);
                    console.log(`✅ Audio cargado: ${filename}`);
                    resolve(audio);
                };

                audio.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error(`Error cargando: ${filename}`));
                };

                audio.onloadstart = () => {
                    if (!isPreload) console.log(`🔄 Cargando: ${filename}`);
                };
            });

            // Iniciar carga
            audio.src = this.baseUrl + filename;
            
            // Esperar carga
            const loadedAudio = await loadPromise;
            
            // Guardar en cache
            this.audioCache.set(filename, loadedAudio);
            
            return loadedAudio;
            
        } catch (error) {
            console.error(`❌ Error cargando ${filename}:`, error);
            throw error;
        }
    }

    // Reproducir audio con cache automático
    async playAudio(filename, isNumber = false) {
        try {
            let audio = this.audioCache.get(filename);
            
            // Si no está en cache, cargarlo ahora
            if (!audio) {
                console.log(`📥 Cargando bajo demanda: ${filename}`);
                audio = await this.loadAudio(filename);
            }

            // Si es un número, interrumpir secuencia actual
            if (isNumber && this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.audioQueue = []; // Limpiar cola
            }

            // Resetear posición
            audio.currentTime = 0;
            this.currentAudio = audio;
            
            // Reproducir con manejo de errores
            const playPromise = audio.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                console.log(`🔊 Reproduciendo: ${filename}`);
                
                // Esperar a que termine el audio
                await this.waitForAudioEnd(audio);
            }
            
            this.currentAudio = null;
            return true;
            
        } catch (error) {
            console.error(`❌ Error reproduciendo ${filename}:`, error);
            this.currentAudio = null;
            return false;
        }
    }

    // Esperar a que termine el audio
    waitForAudioEnd(audio) {
        return new Promise((resolve) => {
            const onEnded = () => {
                audio.removeEventListener('ended', onEnded);
                resolve();
            };
            audio.addEventListener('ended', onEnded);
        });
    }

    // Reproducir audio en cola secuencial
    async playAudioSequence(filenames) {
        if (this.isPlayingSequence) {
            console.log('⏸️ Secuencia en progreso, agregando a cola');
            this.audioQueue.push(...filenames);
            return;
        }

        this.isPlayingSequence = true;
        
        try {
            for (const filename of filenames) {
                // Verificar si llegó un número (prioridad)
                if (this.audioQueue.length === 0) {
                    await this.playAudio(filename);
                    await this.delay(500); // Pausa entre audios
                } else {
                    break; // Interrumpir si hay cola
                }
            }
            
            // Procesar cola si hay elementos
            while (this.audioQueue.length > 0) {
                const nextFile = this.audioQueue.shift();
                await this.playAudio(nextFile);
                await this.delay(500);
            }
            
        } finally {
            this.isPlayingSequence = false;
        }
    }

    // Anunciar número del bingo (PRIORIDAD MÁXIMA)
    async announceNumber(number) {
        const letter = this.getBingoLetter(number);
        const filename = `${letter}${number}.mp3`;
        
        console.log(`📢 Anunciando número: ${number} (${filename})`);
        
        // Los números tienen prioridad absoluta
        return await this.playAudio(filename, true);
    }

    // Reproducir frase específica
    async playPhrase(phraseKey) {
        const phraseMap = {
            'welcome': 'bienvenidos-bingo.mp3',
            'start-game': 'comenzamos-juego.mp3',
            'round-1': 'primera-ronda.mp3',
            'round-2': 'segunda-ronda.mp3',
            'next-number': 'siguiente-numero.mp3',
            'attention': 'atencion-sale.mp3',
            'continue': 'continuamos-con.mp3',
            'we-have': 'tenemos-el.mp3',
            'keep-going': 'seguimos-con.mp3',
            'next-is': 'proximo-numero.mp3',
            'attention-players': 'atencion-jugadores.mp3',
            'listen-well': 'escuchen-bien.mp3',
            'very-attentive': 'muy-atentos.mp3',
            'pay-attention': 'presten-atencion.mp3',
            'exciting': 'que-emocionante.mp3',
            'lets-go': 'vamos-que-vamos.mp3',
            'good-luck': 'suerte-todos.mp3',
            'mark-it': 'a-marcar.mp3',
            'bingo-called': 'han-cantado-bingo.mp3',
            'verifying': 'verificando-ganador.mp3',
            'bingo-correct': 'bingo-correcto.mp3',
            'bingo-incorrect': 'bingo-incorrecto.mp3',
            'thanks': 'gracias-participar.mp3'
        };

        const filename = phraseMap[phraseKey];
        if (!filename) {
            console.warn(`⚠️ Frase no encontrada: ${phraseKey}`);
            return false;
        }

        console.log(`🎤 Reproduciendo frase: ${phraseKey} (${filename})`);
        return await this.playAudio(filename);
    }

    // Reproducir frase aleatoria de transición (sin interrumpir números)
    async playRandomTransition() {
        if (this.isPlayingSequence) return false;
        
        const transitions = [
            'siguiente-numero.mp3',
            'atencion-sale.mp3', 
            'continuamos-con.mp3',
            'tenemos-el.mp3',
            'seguimos-con.mp3',
            'proximo-numero.mp3'
        ];
        
        const randomFile = transitions[Math.floor(Math.random() * transitions.length)];
        return await this.playAudio(randomFile);
    }

    // Reproducir frase aleatoria de ambiente (sin interrumpir números)
    async playRandomAmbient() {
        if (this.isPlayingSequence) return false;
        
        const ambient = [
            'atencion-jugadores.mp3',
            'escuchen-bien.mp3',
            'muy-atentos.mp3',
            'presten-atencion.mp3',
            'que-emocionante.mp3',
            'vamos-que-vamos.mp3',
            'suerte-todos.mp3',
            'a-marcar.mp3'
        ];
        
        const randomFile = ambient[Math.floor(Math.random() * ambient.length)];
        return await this.playAudio(randomFile);
    }

    // Secuencia de inicio del juego
    async playGameStart() {
        console.log('🎬 Iniciando secuencia de bienvenida...');
        
        const sequence = [
            'bienvenidos-bingo.mp3',
            'primera-ronda.mp3', 
            'comenzamos-juego.mp3'
        ];
        
        await this.playAudioSequence(sequence);
        console.log('✅ Secuencia de inicio completada');
        return true;
    }

    // Secuencia cuando cantan BINGO
    async playBingoSequence() {
        console.log('🎯 Iniciando secuencia de BINGO...');
        
        const sequence = [
            'han-cantado-bingo.mp3',
            'verificando-ganador.mp3'
        ];
        
        await this.playAudioSequence(sequence);
        console.log('✅ Secuencia de BINGO completada');
        return true;
    }

    // Resultado de verificación de BINGO (prioridad alta)
    async playBingoResult(isCorrect) {
        const filename = isCorrect ? 'bingo-correcto.mp3' : 'bingo-incorrecto.mp3';
        return await this.playAudio(filename, true); // Prioridad alta como números
    }

    // Obtener letra del BINGO según el número
    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    // Utilidad para delays (reducido a 8 segundos para números)
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Delay específico para números (8 segundos)
    delayForNumber() {
        return this.delay(8000);
    }

    // Limpiar cache si es necesario
    clearCache() {
        console.log('🗑️ Limpiando cache de audio...');
        this.audioCache.clear();
    }

    // Obtener estadísticas del cache
    getCacheStats() {
        return {
            cachedFiles: this.audioCache.size,
            files: Array.from(this.audioCache.keys()),
            isPlayingSequence: this.isPlayingSequence,
            queueLength: this.audioQueue.length
        };
    }

    // Limpiar cola de audio
    clearQueue() {
        this.audioQueue = [];
        this.isPlayingSequence = false;
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }
}

// Exportar globalmente
window.AudioSystem = AudioSystem;

try {
    window.audioSystem = new AudioSystem();
    console.log('✅ Sistema de Audio Cache Progresivo cargado exitosamente');
    console.log('🎵 audioSystem disponible en window:', !!window.audioSystem);
} catch (error) {
    console.error('❌ Error inicializando sistema de audio:', error);
    window.audioSystem = null;
}