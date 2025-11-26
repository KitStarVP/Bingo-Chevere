// Sistema de Audio Fallback con MP3
class AudioFallback {
    constructor() {
        this.audioCache = new Map();
        this.isEnabled = true;
        this.baseUrl = 'audio/';
    }

    // Generar audio usando Web Audio API + TTS
    async generateAudio(text, number) {
        const letter = this.getBingoLetter(number);
        const filename = `${letter}${number}.mp3`;
        
        // Si ya existe en cache, usar ese
        if (this.audioCache.has(filename)) {
            return this.playFromCache(filename);
        }

        // Intentar diferentes métodos
        const methods = [
            () => this.tryGoogleTTS(text),
            () => this.tryLocalFile(filename),
            () => this.tryWebAudioSynthesis(text)
        ];

        for (const method of methods) {
            try {
                const success = await method();
                if (success) return true;
            } catch (error) {
                console.warn('Método de audio falló:', error);
            }
        }

        return false;
    }

    async tryGoogleTTS(text) {
        try {
            const encodedText = encodeURIComponent(text);
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodedText}`;
            
            const audio = new Audio(url);
            audio.volume = 1;
            
            return new Promise((resolve) => {
                audio.onplay = () => {
                    console.log('✅ Google TTS reproduciendo');
                    resolve(true);
                };
                
                audio.onended = () => {
                    console.log('✅ Google TTS completado');
                };
                
                audio.onerror = () => {
                    console.warn('❌ Google TTS falló');
                    resolve(false);
                };
                
                audio.play().catch(() => resolve(false));
                
                // Timeout
                setTimeout(() => resolve(false), 5000);
            });
        } catch (error) {
            return false;
        }
    }

    async tryLocalFile(filename) {
        try {
            const audio = new Audio(this.baseUrl + filename);
            audio.volume = 1;
            
            return new Promise((resolve) => {
                audio.onloadstart = () => {
                    console.log(`🎵 Cargando archivo local: ${filename}`);
                };
                
                audio.onplay = () => {
                    console.log('✅ Archivo local reproduciendo');
                    resolve(true);
                };
                
                audio.onended = () => {
                    console.log('✅ Archivo local completado');
                };
                
                audio.onerror = () => {
                    console.warn(`❌ Archivo local no encontrado: ${filename}`);
                    resolve(false);
                };
                
                audio.play().catch(() => resolve(false));
                
                // Timeout
                setTimeout(() => resolve(false), 3000);
            });
        } catch (error) {
            return false;
        }
    }

    async tryWebAudioSynthesis(text) {
        // Fallback usando Web Audio API para generar tonos
        try {
            if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
                return false;
            }

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Generar tono simple para indicar el número
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            
            console.log('🎵 Tono de audio generado');
            return true;
        } catch (error) {
            return false;
        }
    }

    playFromCache(filename) {
        const cachedAudio = this.audioCache.get(filename);
        if (cachedAudio) {
            cachedAudio.currentTime = 0;
            cachedAudio.play().catch(console.error);
            return true;
        }
        return false;
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    // Método principal para usar desde bingo-caller
    async announceNumber(number) {
        const letter = this.getBingoLetter(number);
        const text = `${letter} ${number}, repito, ${letter} ${number}`;
        
        console.log(`🎵 Audio Fallback: ${text}`);
        return this.generateAudio(text, number);
    }
}

// Exportar globalmente
window.AudioFallback = AudioFallback;
window.audioFallback = new AudioFallback();