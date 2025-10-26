// Sala de Juego Nueva - Sistema Completo
class GameRoom {
    constructor() {
        this.cards = [];
        this.calledNumbers = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.currentPrize = 450;
        this.audioEnabled = true;
        this.gameStartedNotified = false; // Flag para controlar aviso de inicio
        this.currentGameId = null; // Para detectar cambios de juego
        
        this.init();
    }

    init() {
        console.log('🎮 Iniciando nueva sala de juego...');
        
        // Generar grid de números primero
        this.generateNumbersGrid();
        
        this.setupAudio();
        this.loadCards();
        this.loadInitialGameState();
        this.startGameMonitoring();
        this.updateGameInfo();
        this.loadCurrentPattern();
        
        // Mostrar estado del audio
        setTimeout(() => {
            console.log('Estado del audio:', {
                speechSynthesis: !!window.speechSynthesis,
                audioEnabled: this.audioEnabled,
                audioActivated: this.audioActivated,
                voices: this.voices?.length || 0
            });
        }, 3000);
    }

    // === AUDIO SYSTEM ===
    setupAudio() {
        if ('speechSynthesis' in window) {
            this.speech = window.speechSynthesis;
            this.audioActivated = false;
            this.audioAttempts = 0;
            this.loadVoices();
            
            // Cargar voces cuando estén disponibles
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
            
            // Activar audio en múltiples eventos para máxima compatibilidad
            const activateEvents = ['touchstart', 'click', 'keydown', 'mousedown', 'touchend', 'pointerdown'];
            activateEvents.forEach(event => {
                document.addEventListener(event, () => {
                    if (!this.audioActivated) {
                        this.activateAudio();
                    }
                }, { once: false }); // Permitir múltiples intentos
            });
            
            // Intentos periódicos de activación
            const tryActivation = () => {
                if (!this.audioActivated && this.audioAttempts < 5) {
                    this.audioAttempts++;
                    this.activateAudio();
                    setTimeout(tryActivation, 3000);
                }
            };
            
            setTimeout(tryActivation, 1000);
            
            console.log('🔊 Sistema de audio configurado');
        } else {
            console.log('❌ SpeechSynthesis no disponible en este navegador');
            this.audioEnabled = false;
        }
    }

    loadVoices() {
        this.voices = this.speech.getVoices();
        
        // Buscar la mejor voz en español disponible
        const spanishVoices = this.voices.filter(v => 
            v.lang.startsWith('es') || 
            v.name.toLowerCase().includes('spanish') ||
            v.name.toLowerCase().includes('español') ||
            v.name.toLowerCase().includes('maria') ||
            v.name.toLowerCase().includes('diego')
        );
        
        // Preferir voces locales sobre las de red
        this.spanishVoice = spanishVoices.find(v => v.localService) || 
                           spanishVoices[0] || 
                           this.voices[0];
        
        console.log('🎤 Voces disponibles:', this.voices.length);
        console.log('🎤 Voz seleccionada:', this.spanishVoice?.name || 'Ninguna');
        console.log('🎤 Idioma de voz:', this.spanishVoice?.lang || 'Desconocido');
        console.log('🎤 Servicio local:', this.spanishVoice?.localService || false);
    }

    activateAudio() {
        if (this.speech) {
            try {
                // Siempre intentar reactivar para asegurar compatibilidad
                this.speech.cancel();
                
                // Crear utterance silencioso para activar
                const utterance = new SpeechSynthesisUtterance(' ');
                utterance.volume = 0.01;
                utterance.rate = 2;
                utterance.pitch = 1;
                
                utterance.onend = () => {
                    this.audioActivated = true;
                    console.log('✅ Audio activado correctamente');
                };
                
                utterance.onerror = (e) => {
                    console.log('⚠️ Error en activación, pero continuando:', e.error);
                    this.audioActivated = true;
                };
                
                // Intentar hablar para activar
                this.speech.speak(utterance);
                
                // Marcar como activado después de un tiempo corto
                setTimeout(() => {
                    this.audioActivated = true;
                    console.log('✅ Audio marcado como activado');
                }, 500);
                
            } catch (error) {
                console.error('❌ Error activando audio:', error);
                this.audioActivated = true; // Marcar como activado para intentar funcionar
            }
        } else {
            console.log('⚠️ SpeechSynthesis no disponible');
            this.audioActivated = false;
        }
    }

    speakNumber(number) {
        // Solo hablar si el usuario tiene cartones
        if (this.cards.length === 0) return;
        
        if (!this.audioEnabled || !this.speech) {
            console.log('Audio deshabilitado o no disponible');
            return;
        }

        try {
            // Forzar activación de audio en cada llamada
            this.activateAudio();
            
            // Cancelar síntesis anterior completamente
            this.speech.cancel();
            
            // Esperar un momento para que se cancele
            setTimeout(() => {
                const letter = this.getBingoLetter(number);
                const text = `${letter} ${number} repito ${letter} ${number}`;
                
                console.log('🔊 Cantando número:', text);
                
                const utterance = new SpeechSynthesisUtterance(text);
                
                // Configurar voz si está disponible
                if (this.spanishVoice) {
                    utterance.voice = this.spanishVoice;
                }
                
                // Configuración optimizada para compatibilidad
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                utterance.lang = 'es-ES';
                
                // Eventos mejorados
                utterance.onstart = () => {
                    console.log('✅ Iniciando síntesis de:', text);
                };
                
                utterance.onend = () => {
                    console.log('✅ Terminó síntesis de:', text);
                };
                
                utterance.onerror = (e) => {
                    console.error('❌ Error en síntesis:', e.error);
                    // Fallback inmediato con configuración mínima
                    this.fallbackSpeech(letter, number);
                };
                
                // Intentar hablar con manejo de errores
                try {
                    this.speech.speak(utterance);
                } catch (speakError) {
                    console.error('❌ Error al hablar:', speakError);
                    this.fallbackSpeech(letter, number);
                }
                
            }, 100);
            
        } catch (error) {
            console.error('❌ Error general en speakNumber:', error);
            this.fallbackSpeech(this.getBingoLetter(number), number);
        }
    }
    
    fallbackSpeech(letter, number) {
        try {
            console.log('🔄 Intentando fallback de voz...');
            const simpleText = `${letter} ${number}`;
            const fallbackUtterance = new SpeechSynthesisUtterance(simpleText);
            fallbackUtterance.rate = 1.0;
            fallbackUtterance.volume = 1.0;
            fallbackUtterance.lang = 'es';
            
            this.speech.speak(fallbackUtterance);
        } catch (e) {
            console.error('❌ Fallback también falló:', e);
            // Mostrar toast como último recurso
            this.showToast(`🔊 ${letter}${number}`);
        }
    }

    // === CARD MANAGEMENT ===
    loadCards() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (!window.firebase) {
            console.error('❌ Firebase no disponible - no se pueden cargar cartones');
            this.showAccessBlocked();
            return;
        }
        
        if (!userPhone) {
            console.error('❌ Teléfono de usuario no encontrado');
            this.showAccessBlocked();
            return;
        }
        
        this.loadCardsFromFirebase(userPhone);
    }
    
    loadCardsFromFirebase(phone) {
        const { database, ref, onValue } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        onValue(ref(database, `playerCards/${cleanPhone}`), (snapshot) => {
            const firebaseCards = snapshot.val();
            if (firebaseCards && Array.isArray(firebaseCards)) {
                this.cards = firebaseCards.filter(card => 
                    card.status === 'vigente' || card.status === 'en_uso'
                );
                
                this.processLoadedCards();
                console.log('✅ Cartones cargados desde Firebase:', this.cards.length);
            } else {
                console.log('⚠️ No hay cartones en Firebase para:', cleanPhone);
                this.cards = [];
                this.showAccessBlocked();
            }
        }, (error) => {
            console.error('❌ Error cargando cartones desde Firebase:', error);
            this.showAccessBlocked();
        });
    }
    

    
    processLoadedCards() {
        // Filtrar cartones activos (vigente, en_uso, pendiente_pago)
        this.cards = this.cards.filter(card => 
            ['vigente', 'en_uso', 'pendiente_pago'].includes(card.status)
        );
        
        // Procesar cartones activos
        this.cards.forEach(card => {
            if (!card.marked) card.marked = [];
            if (card.autoMode === undefined) card.autoMode = true;
            if (!card.id) card.id = Date.now() + Math.random();
        });

        console.log('Cartones activos:', this.cards.length);

        if (this.cards.length === 0) {
            this.showAccessBlocked();
        } else {
            console.log('✅ Cartones cargados correctamente');
            
            if (this.gameActive) {
                this.renderCards();
                setTimeout(() => {
                    this.cards.forEach(card => {
                        if (card.autoMode && this.calledNumbers.length > 0) {
                            this.autoMarkCard(card);
                        }
                    });
                    this.renderCards();
                }, 1000);
            } else {
                this.showWaitingForGame();
            }
        }
    }

    showWaitingState() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        
        container.innerHTML = '';
        waitingState.style.display = 'block';
        
        // Ocultar elementos del juego cuando no hay cartones
        this.hideGameElements();
    }
    
    showWaitingForGame() {
        const container = document.getElementById('cards-container');
        
        container.innerHTML = `
            <div class="waiting-content" style="text-align: center; padding: 4rem 2rem;">
                <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 3rem 2rem; border: 1px solid rgba(255,255,255,0.2);">
                    <h2 style="color: white; font-size: 2rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">⏳ Esperando Juego</h2>
                    <p style="color: rgba(255,255,255,0.9); font-size: 1.1rem; margin-bottom: 2rem;">Tienes cartones listos. Esperando que el administrador inicie el próximo juego.</p>
                    <div style="background: rgba(40,167,69,0.2); padding: 1rem; border-radius: 10px; margin: 1rem 0;">
                        <p style="color: #28a745; font-weight: 600;">✅ Cartones vigentes: ${this.cards.length}</p>
                        <p style="color: rgba(255,255,255,0.8); font-size: 0.9rem; margin-top: 0.5rem;">Tus cartones están seguros y listos para jugar</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    showAccessBlocked() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        const accessBlocked = document.getElementById('access-blocked');
        
        container.innerHTML = '';
        waitingState.style.display = 'none';
        accessBlocked.style.display = 'block';
        
        // Ocultar elementos del juego
        this.hideGameElements();
    }

    renderCards() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        
        if (!container) return;
        
        container.innerHTML = '';
        waitingState.style.display = 'none';
        
        // Mostrar elementos del juego cuando hay cartones
        this.showGameElements();

        this.cards.forEach(card => {
            // Verificar completitud antes de renderizar
            this.updateCardCompletionStatus(card);
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        
        // Asegurar autoMode y estado
        if (card.autoMode === undefined) card.autoMode = true;
        if (card.missedOpportunity === undefined) card.missedOpportunity = false;
        if (card.numbersWhenCompleted === undefined) card.numbersWhenCompleted = null;
        
        const cardCode = card.code || `C${card.id}`;
        const hasBingo = this.checkBingo(card);
        const hasPattern = this.checkPattern(card);
        const hasLine = this.checkLine(card);
        
        // LÓGICA MEJORADA DE DETECCIÓN
        let canCallBingo = false;
        let bingoClass = '';
        let bingoText = 'BINGO';
        
        if (card.missedOpportunity) {
            bingoClass = 'missed-opportunity';
            bingoText = '❌ OPORTUNIDAD PERDIDA';
            canCallBingo = false;
        } else if (hasBingo) {
            bingoClass = 'has-bingo';
            bingoText = '🏆 CARTÓN LLENO';
            canCallBingo = true;
        } else if (this.currentRound === 1 && hasPattern) {
            bingoClass = 'has-pattern';
            bingoText = '🎯 PATRÓN COMPLETO';
            canCallBingo = true;
        } else if (this.currentRound === 2 && hasLine) {
            bingoClass = 'has-line';
            bingoText = '📏 LÍNEA COMPLETA';
            canCallBingo = true;
        }
        
        // Crear elementos con estado mejorado
        const modeStatus = card.autoMode ? '🤖 AUTO' : '✋ MANUAL';
        const cardStatus = card.missedOpportunity ? ' missed-card' : '';
        
        cardDiv.innerHTML = `
            <div class="card-header${cardStatus}">ID-${cardCode} (${modeStatus})</div>
            <div class="bingo-letters">
                <span>B</span>
                <span>I</span>
                <span>N</span>
                <span>G</span>
                <span>O</span>
            </div>
            <div class="card-grid">
                ${this.generateCardGrid(card)}
            </div>
            <div class="card-controls">
                <div class="mode-selector">
                    <button class="mode-option ${card.autoMode ? 'active' : ''}" data-card-id="${card.id}" data-mode="auto">
                        🤖 Auto
                    </button>
                    <button class="mode-option ${!card.autoMode ? 'active' : ''}" data-card-id="${card.id}" data-mode="manual">
                        ✋ Manual
                    </button>
                </div>
                <button class="bingo-btn ${bingoClass}" data-card-id="${card.id}" data-action="bingo"
                        ${!canCallBingo ? 'disabled' : ''}>
                    ${bingoText}
                </button>
            </div>
        `;

        // Agregar event listeners después de crear el HTML
        this.addCardEventListeners(cardDiv, card);

        return cardDiv;
    }
    
    // Nueva función para actualizar estado de completitud
    updateCardCompletionStatus(card) {
        if (card.missedOpportunity) return; // Ya perdió la oportunidad
        
        const hasBingo = this.checkBingo(card);
        const hasPattern = this.checkPattern(card);
        
        const isComplete = hasBingo || (this.currentRound === 1 && hasPattern);
        
        if (isComplete && !card.numbersWhenCompleted) {
            // Marcar cuándo se completó
            card.numbersWhenCompleted = this.calledNumbers.length;
            console.log(`🎯 Cartón ${card.id} completado en número ${this.calledNumbers.length}`);
        }
    }

    generateCardGrid(card) {
        return Array.from({ length: 25 }, (_, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const number = card.numbers[row][col];
            const isFree = number === 0;
            const isMarked = card.marked.includes(`${row}-${col}`) || isFree;
            
            // Verificar si el número fue cantado
            const calledNumbers = this.calledNumbers.map(item => 
                typeof item === 'object' ? item.number : item
            );
            const wasCalled = calledNumbers.includes(number);
            
            let cellClass = 'card-cell';
            if (isMarked) cellClass += ' marked';
            if (isFree) cellClass += ' free';
            if (wasCalled && !isFree) cellClass += ' called';
            
            return `<div class="${cellClass}" 
                         data-card-id="${card.id}" data-row="${row}" data-col="${col}" data-number="${number}">
                        ${isFree ? 'FREE' : number}
                    </div>`;
        }).join('');
    }

    addCardEventListeners(cardDiv, card) {
        // Event listeners para botones de modo
        const modeButtons = cardDiv.querySelectorAll('.mode-option');
        console.log(`Agregando listeners a ${modeButtons.length} botones de modo para cartón ${card.id}`);
        
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cardId = parseInt(e.target.dataset.cardId);
                const isAuto = e.target.dataset.mode === 'auto';
                console.log('Mode button clicked:', cardId, isAuto, 'Current mode:', card.autoMode);
                this.setMode(cardId, isAuto);
            });
        });

        // Event listener para botón BINGO
        const bingoBtn = cardDiv.querySelector('.bingo-btn');
        if (bingoBtn) {
            bingoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cardId = parseInt(e.target.dataset.cardId);
                console.log('Bingo button clicked:', cardId);
                this.callBingo(cardId);
            });
        }

        // Event listeners para celdas
        const cells = cardDiv.querySelectorAll('.card-cell');
        console.log(`Agregando listeners a ${cells.length} celdas para cartón ${card.id}`);
        
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cardId = parseInt(e.target.dataset.cardId);
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                console.log('Cell clicked:', cardId, row, col, 'Card autoMode:', card.autoMode);
                this.toggleCell(cardId, row, col);
            });
        });
    }

    toggleCell(cardId, row, col) {
        console.log('🔄 toggleCell:', cardId, row, col);
        const card = this.cards.find(c => c.id == cardId);
        if (!card) {
            console.log('❌ Card not found:', cardId);
            return;
        }

        if (card.autoMode) {
            this.showToast('⚠️ Desactiva modo automático para marcar manualmente');
            return;
        }

        const number = card.numbers[row][col];
        if (number === 0) return; // No marcar FREE

        const cellKey = `${row}-${col}`;
        const isMarked = card.marked.includes(cellKey);
        
        if (isMarked) {
            // Desmarcar
            card.marked = card.marked.filter(key => key !== cellKey);
            this.showToast(`❌ Desmarcado: ${this.getBingoLetter(number)}${number}`);
        } else {
            // Marcar
            card.marked.push(cellKey);
            this.showToast(`✅ Marcado: ${this.getBingoLetter(number)}${number}`);
        }

        // Verificar completitud después de marcar/desmarcar
        this.updateCardCompletionStatus(card);
        
        console.log('💾 Guardando cambios...');
        this.saveCards();
        this.renderCards();
    }

    setMode(cardId, isAuto) {
        console.log('🔄 setMode called with:', cardId, isAuto);
        const card = this.cards.find(c => c.id == cardId);
        if (!card) {
            console.log('❌ Card not found for setMode:', cardId, 'Available cards:', this.cards.map(c => c.id));
            return;
        }

        // Solo cambiar si es diferente
        if (card.autoMode === isAuto) {
            console.log('⚠️ Mode already set to:', isAuto);
            return;
        }

        console.log('✅ Card found, changing mode from', card.autoMode, 'to', isAuto);
        card.autoMode = isAuto;
        
        if (card.autoMode) {
            // Marcar automáticamente todos los números ya cantados
            this.autoMarkCard(card);
            this.showToast('🤖 Modo automático activado');
        } else {
            this.showToast('✋ Modo manual activado');
        }

        this.saveCards();
        this.renderCards();
    }

    autoMarkCard(card) {
        let markedCount = 0;
        
        // Obtener números cantados (manejar tanto objetos como números simples)
        const calledNumbers = this.calledNumbers.map(item => 
            typeof item === 'object' ? item.number : item
        );
        
        calledNumbers.forEach(number => {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    if (card.numbers[row][col] === number) {
                        const cellKey = `${row}-${col}`;
                        if (!card.marked.includes(cellKey)) {
                            card.marked.push(cellKey);
                            markedCount++;
                        }
                    }
                }
            }
        });
        
        if (markedCount > 0) {
            console.log(`Auto-marcadas ${markedCount} celdas en cartón ${card.id}`);
        }
    }

    // === BINGO LOGIC ===
    checkBingo(card) {
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cellKey = `${row}-${col}`;
                const isFree = card.numbers[row][col] === 0;
                if (!isFree && !card.marked.includes(cellKey)) {
                    return false;
                }
            }
        }
        return true;
    }

    checkPattern(card) {
        // Obtener patrón desde Firebase (ya cargado en this.currentPattern)
        if (!this.currentPattern || !this.currentPattern.positions) {
            return false;
        }
        
        // Verificar si todas las posiciones del patrón están marcadas
        for (const [row, col] of this.currentPattern.positions) {
            const cellKey = `${row}-${col}`;
            const isFree = card.numbers[row][col] === 0;
            
            if (!isFree && !card.marked.includes(cellKey)) {
                return false;
            }
        }
        
        return true;
    }

    checkLine(card) {
        // En ronda 1, NO verificar líneas, solo patrones
        if (this.currentRound === 1) {
            return false; // En ronda 1 solo importa el patrón
        }
        
        // Ronda 2: verificar líneas tradicionales
        // Filas
        for (let row = 0; row < 5; row++) {
            let complete = true;
            for (let col = 0; col < 5; col++) {
                const cellKey = `${row}-${col}`;
                const isFree = card.numbers[row][col] === 0;
                if (!isFree && !card.marked.includes(cellKey)) {
                    complete = false;
                    break;
                }
            }
            if (complete) return true;
        }

        // Columnas
        for (let col = 0; col < 5; col++) {
            let complete = true;
            for (let row = 0; row < 5; row++) {
                const cellKey = `${row}-${col}`;
                const isFree = card.numbers[row][col] === 0;
                if (!isFree && !card.marked.includes(cellKey)) {
                    complete = false;
                    break;
                }
            }
            if (complete) return true;
        }

        // Diagonales
        let diag1 = true, diag2 = true;
        for (let i = 0; i < 5; i++) {
            const cell1 = `${i}-${i}`;
            const cell2 = `${i}-${4-i}`;
            const isFree1 = card.numbers[i][i] === 0;
            const isFree2 = card.numbers[i][4-i] === 0;
            
            if (!isFree1 && !card.marked.includes(cell1)) diag1 = false;
            if (!isFree2 && !card.marked.includes(cell2)) diag2 = false;
        }

        return diag1 || diag2;
    }

    callBingo(cardId) {
        console.log('🎯 callBingo called for card:', cardId);
        const card = this.cards.find(c => c.id == cardId);
        if (!card) {
            console.log('❌ Card not found for callBingo:', cardId, 'Available cards:', this.cards.map(c => c.id));
            return;
        }

        const hasBingo = this.checkBingo(card);
        const hasLine = this.checkLine(card);

        console.log('🔍 Checking bingo status:', { hasBingo, hasLine, round: this.currentRound });

        if (!hasBingo && !hasLine) {
            this.showToast('❌ Este cartón no tiene BINGO ni línea completa');
            return;
        }

        const playerPhone = localStorage.getItem('userPhone') || '04XX-XXXXXXX';
        const bingoType = hasBingo ? 'CARTON_LLENO' : (this.currentRound === 1 ? 'PATRON' : 'LINEA');
        
        const bingoData = {
            cartonId: card.code || card.id,
            phone: playerPhone,
            type: bingoType,
            typeText: hasBingo ? 'Cartón Lleno' : (this.currentRound === 1 ? 'Patrón' : 'Línea'),
            timestamp: Date.now(),
            round: this.currentRound,
            cardNumbers: card.numbers,
            markedCells: card.marked,
            calledNumbers: [...this.calledNumbers]
        };

        console.log('📤 Sending BINGO to Firebase:', bingoData);

        // Marcar cartón como pendiente de pago
        card.status = 'pendiente_pago';
        card.bingoTimestamp = Date.now();
        this.saveCards();

        // Enviar BINGO a Firebase para verificación del admin
        this.sendBingoToFirebase(bingoData);
        
        // Mostrar alerta local
        this.showBingoAlert(bingoData);
        
        // Deshabilitar todos los botones de BINGO
        this.disableAllBingoButtons();
    }

    sendBingoToFirebase(bingoData) {
        if (!window.firebase) {
            console.error('❌ Firebase no disponible - no se puede enviar BINGO');
            return;
        }
        
        const { database, ref, set } = window.firebase;
        
        // Enviar BINGO para verificación del admin (usar set en lugar de push)
        set(ref(database, 'pendingBingoVerification'), bingoData)
            .then(() => {
                console.log('✅ BINGO enviado a Firebase para verificación');
                // También crear alerta global
                return set(ref(database, 'globalBingoAlert'), {
                    ...bingoData,
                    timestamp: Date.now(),
                    alertType: 'bingo_verification'
                });
            })
            .then(() => {
                console.log('✅ Alerta global de BINGO creada');
            })
            .catch(error => {
                console.error('❌ Error enviando BINGO:', error);
            });
    }

    disableAllBingoButtons() {
        const buttons = document.querySelectorAll('.bingo-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'VERIFICANDO...';
            btn.className = 'bingo-btn';
        });
    }

    enableAllBingoButtons() {
        this.renderCards(); // Re-renderizar para restaurar estados
    }

    // === GAME MONITORING ===
    loadInitialGameState() {
        if (!window.firebase) {
            console.log('Firebase no disponible para cargar estado inicial');
            return;
        }
        
        const { database, ref, get } = window.firebase;
        
        get(ref(database, 'gameState')).then((snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.gameActive = gameState.gameActive || false;
                this.currentRound = gameState.currentRound || 1;
                this.isPaused = gameState.isPaused || false;
                this.currentPattern = gameState.currentPattern;
                this.currentGameId = gameState.gameId;
                
                console.log('✅ Estado inicial cargado - NO expirando cartones en carga inicial');
                
                if (this.isPaused) {
                    this.showPauseAlert();
                }
                
                this.updateGameInfo();
            } else {
                console.log('⏸️ No hay juego activo');
                this.gameActive = false;
            }
        }).catch(error => {
            console.error('❌ Error cargando estado inicial:', error);
            this.gameActive = false;
        });
        
        // Cargar números cantados con mejor manejo
        get(ref(database, 'calledNumbers')).then((snapshot) => {
            let numbers = snapshot.val();
            
            // Manejar diferentes formatos
            if (numbers && typeof numbers === 'object' && !Array.isArray(numbers)) {
                numbers = Object.values(numbers);
            }

            if (numbers && Array.isArray(numbers) && numbers.length > 0) {
                const normalizedNumbers = numbers.map(item => 
                    (item && typeof item === 'object' && item.number !== undefined) ? item.number : item
                ).filter(item => typeof item === 'number' && item >= 1 && item <= 75);

                this.calledNumbers = [...normalizedNumbers];
                console.log('✅ Números cantados cargados:', this.calledNumbers.length);
                
                // Procesar números existentes
                this.processExistingNumbers();
            } else {
                console.log('📝 No hay números cantados aún');
                this.calledNumbers = [];
            }
        }).catch(error => {
            console.error('❌ Error cargando números cantados:', error);
            this.calledNumbers = [];
        });
    }
    
    processExistingNumbers() {
        // Generar grid de historial primero
        this.generateNumbersGrid();
        
        // Marcar números en el historial sin animación
        this.calledNumbers.forEach(num => {
            const cell = document.getElementById(`num-${num}`);
            if (cell) {
                cell.classList.add('called');
                cell.style.background = '#3498db';
                cell.style.color = 'white';
            }
        });
        
        // Mostrar últimos números
        if (this.calledNumbers.length > 0) {
            const lastNumber = this.calledNumbers[this.calledNumbers.length - 1];
            const letter = this.getBingoLetter(lastNumber);
            this.updateRecentNumbers(letter, lastNumber);
        }
        
        // Auto-marcar cartones con números ya cantados
        setTimeout(() => {
            this.cards.forEach(card => {
                if (card.autoMode) {
                    this.autoMarkCard(card);
                }
            });
            this.renderCards();
        }, 300);
    }
    
    startGameMonitoring() {
        // Inicializar Firebase listeners
        this.initFirebaseListeners();
        
        // Mantener verificación local como backup
        setInterval(() => {
            this.checkGameState();
            this.checkBingoAlerts();
        }, 1000);
    }
    
    initFirebaseListeners() {
        if (!window.firebase) {
            console.log('Firebase no disponible, usando localStorage');
            return;
        }
        
        const { database, ref, onValue } = window.firebase;
        
        // Escuchar cambios en el estado del juego con manejo de errores
        onValue(ref(database, 'gameState'), (snapshot) => {
            try {
                const firebaseState = snapshot.val();
                if (firebaseState) {
                    console.log('📡 Estado recibido de Firebase:', firebaseState);
                    this.handleFirebaseGameState(firebaseState);
                } else {
                    console.log('⚠️ Estado del juego es null - posible cancelación');
                    this.handleGameCancellation();
                }
            } catch (error) {
                console.error('❌ Error procesando estado del juego:', error);
            }
        }, (error) => {
            console.error('❌ Error en listener de gameState:', error);
        });
        
        // Escuchar números cantados - LISTENER CRÍTICO
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            try {
                let firebaseNumbers = snapshot.val();
                console.log('📡 Datos RAW de Firebase calledNumbers:', firebaseNumbers);
                
                // Manejar diferentes formatos
                if (firebaseNumbers && typeof firebaseNumbers === 'object' && !Array.isArray(firebaseNumbers)) {
                    firebaseNumbers = Object.values(firebaseNumbers);
                    console.log('🔄 Convertido a array:', firebaseNumbers);
                }

                if (firebaseNumbers && Array.isArray(firebaseNumbers) && firebaseNumbers.length > 0) {
                    console.log('✅ Procesando números de Firebase:', firebaseNumbers);
                    this.handleFirebaseNumbers(firebaseNumbers);
                } else if (firebaseNumbers === null || (Array.isArray(firebaseNumbers) && firebaseNumbers.length === 0)) {
                    console.log('🔄 Lista de números reiniciada o vacía');
                    this.handleNumbersReset();
                } else {
                    console.log('📝 No hay números o formato no reconocido');
                }
            } catch (error) {
                console.error('❌ Error procesando números cantados:', error);
            }
        }, (error) => {
            console.error('❌ Error en listener de calledNumbers:', error);
        });
        
        // Escuchar resultado de verificación de BINGO
        onValue(ref(database, 'bingoVerificationResult'), (snapshot) => {
            try {
                const result = snapshot.val();
                if (result) {
                    console.log('📝 Resultado de verificación recibido:', result);
                    this.handleVerificationResult(result);
                }
            } catch (error) {
                console.error('❌ Error procesando resultado de verificación:', error);
            }
        });
        
        console.log('✅ Firebase listeners iniciados con manejo de errores');
    }
    
    handleGameCancellation() {
        console.log('🚫 Detectada cancelación del juego');
        this.gameActive = false;
        // Solo expirar si hay una cancelación explícita
        this.resetGameAlerts();
        this.showToast('⏸️ No hay juego activo. Esperando próximo juego.');
    }
    
    handleNumbersReset() {
        console.log('🔄 Reiniciando números cantados');
        this.calledNumbers = [];
        
        // Limpiar visualizaciones
        const recentNumbers = document.querySelectorAll('.recent-number');
        recentNumbers.forEach(num => {
            num.textContent = '--';
            num.classList.remove('latest');
        });
        
        // Limpiar historial
        const calledCells = document.querySelectorAll('.number-cell.called');
        calledCells.forEach(cell => {
            cell.classList.remove('called');
            cell.style.background = '';
            cell.style.color = '';
            cell.style.transform = '';
        });
        
        // Ocultar mini-bola
        const miniBall = document.getElementById('mini-ball');
        if (miniBall) {
            miniBall.style.display = 'none';
            miniBall.classList.remove('show');
        }
        
        // Re-renderizar cartones
        this.renderCards();
    }
    
    // Función removida - ahora se usa handleVerificationResult
    
    handleFirebaseGameState(firebaseState) {
        console.log('📲 Estado recibido de Firebase:', firebaseState);
        
        // Verificar cambio de ronda - MANTENER NÚMEROS Y MARCAS
        const previousRound = this.currentRound;
        if (firebaseState && firebaseState.currentRound !== previousRound) {
            console.log(`🔄 Cambio de ronda: ${previousRound} → ${firebaseState.currentRound}`);
            this.currentRound = firebaseState.currentRound;
            
            // NO limpiar números ni marcas - solo cambiar objetivo
            if (this.currentRound === 2) {
                this.showToast('➡️ Ronda 2: Objetivo cambiado a CARTÓN LLENO');
                // Resetear oportunidades perdidas para nueva ronda
                this.cards.forEach(card => {
                    card.missedOpportunity = false;
                    card.numbersWhenCompleted = null;
                });
            }
            
            this.renderCards(); // Re-renderizar con nuevos objetivos
            return;
        }
        
        // SOLO expirar cartones EN_USO cuando se cierra bingo
        if (firebaseState && firebaseState.bingoClosed && firebaseState.expireCards) {
            console.log('🔒 Bingo cerrado - expirando solo cartones en uso');
            this.markCardsInUseExpired('Bingo cerrado por administrador');
            this.gameActive = false;
            this.resetGameAlerts();
            this.resetVisuals();
            this.showToast('🔒 Bingo cerrado. Cartones del juego actual expirados.');
            return;
        }
        
        // SOLO expirar cartones EN_USO cuando se finaliza partida
        if (firebaseState && (firebaseState.gameFinalized || firebaseState.bothRoundsCompleted) && firebaseState.expireCards) {
            console.log('🏁 Partida completa - expirando solo cartones en uso');
            this.markCardsInUseExpired('Partida completada (2 rondas)');
            this.gameActive = false;
            this.resetGameAlerts();
            this.showToast('🏁 Partida finalizada. Cartones del juego actual expirados.');
            return;
        }
        
        // Si no hay estado del juego, verificar si es preparación para nuevo juego
        if (!firebaseState || firebaseState === null) {
            console.log('⏸️ No hay juego activo - cartones siguen válidos');
            this.gameActive = false;
            this.resetGameAlerts();
            
            // SIEMPRE mostrar espera si hay cartones, NUNCA expirar por falta de juego
            if (this.cards.length > 0) {
                this.showWaitingForGame();
            }
            return;
        }
        
        // Verificar si es un nuevo juego (gameId diferente)
        if (firebaseState.readyForNewGame && firebaseState.gameId !== this.currentGameId) {
            console.log('🆕 Nuevo juego detectado');
            this.currentGameId = firebaseState.gameId;
            this.calledNumbers = [];
            this.resetVisuals();
            // Limpiar marcas de cartones para nuevo juego
            this.cards.forEach(card => {
                card.marked = [];
            });
            this.showToast('🆕 Nuevo juego iniciado!');
        }
        
        // Actualizar estado local (sin cambiar ronda aquí)
        const previousGameActive = this.gameActive;
        const wasPaused = this.isPaused;
        
        this.gameActive = firebaseState.gameActive || false;
        // currentRound ya se actualizó arriba si cambió
        this.isPaused = firebaseState.isPaused || false;
        
        // Detectar cambios importantes
        const gameStarted = !previousGameActive && this.gameActive;
        const gameEnded = previousGameActive && !this.gameActive;
        const pauseChanged = wasPaused !== this.isPaused;
        
        if (gameStarted) {
            console.log('▶️ Juego iniciado');
            this.handleGameStarted();
        } else if (gameEnded) {
            console.log('⏹️ Juego terminado');
            this.handleGameEnded();
        }
        
        // Si no hay juego activo pero hay cartones, mostrar espera
        if (!this.gameActive && this.cards.length > 0) {
            this.showWaitingForGame();
        }
        
        // Manejar cambios de pausa
        if (pauseChanged) {
            if (this.isPaused) {
                this.showPauseAlert();
            } else if (wasPaused && !this.isPaused) {
                this.hidePauseAlert();
                this.showToast('▶️ Juego reanudado');
            }
        }
        
        // Actualizar patrón
        if (firebaseState.currentPattern) {
            this.currentPattern = firebaseState.currentPattern;
            if (this.currentRound === 1) {
                this.showPatternButton();
            }
        }
        
        this.updateGameInfo();
    }
    
    handleFirebaseNumbers(firebaseNumbers) {
        if (!Array.isArray(firebaseNumbers)) return;

        // Normalizar números de Firebase
        const allFirebaseNumbers = firebaseNumbers.map(item => 
            (item && typeof item === 'object' && item.number !== undefined) ? item.number : item
        ).filter(item => typeof item === 'number' && item >= 1 && item <= 75);

        console.log('📡 Números de Firebase:', allFirebaseNumbers);
        console.log('📝 Números locales:', this.calledNumbers);

        // Sincronizar completamente con Firebase (evita duplicados)
        const newNumbers = allFirebaseNumbers.filter(num => !this.calledNumbers.includes(num));
        
        if (newNumbers.length > 0) {
            console.log('🎯 NUEVOS NÚMEROS DETECTADOS:', newNumbers);

            // Procesar todos los números nuevos inmediatamente
            newNumbers.forEach(num => {
                console.log(`🎱 Procesando número: ${num}`);
                
                // Agregar a lista local inmediatamente
                if (!this.calledNumbers.includes(num)) {
                    this.calledNumbers.push(num);
                }
                
                // Procesar número sin delay
                this.updateLastNumber(num);
                this.markNumberCalled(num);
                this.autoMarkAllCards(num);
                this.speakNumber(num);
            });

            // Actualizar lista completa para evitar desincronización
            this.calledNumbers = [...allFirebaseNumbers];
            
            // Guardar cambios inmediatamente
            this.saveCards();
            this.renderCards();
        } else {
            // Verificar si hay desincronización
            if (allFirebaseNumbers.length !== this.calledNumbers.length) {
                console.log('🔄 Sincronizando con Firebase...');
                this.calledNumbers = [...allFirebaseNumbers];
                this.processExistingNumbers();
            }
        }
    }
    
    handleGameStarted() {
        const needsMarking = this.cards.some(card => card.status === 'vigente');
        if (needsMarking) {
            this.markCardsInUse();
            // Solo mostrar aviso la primera vez que inicia
            if (!this.gameStartedNotified) {
                this.showToast('✅ ¡El juego ha comenzado!');
                this.gameStartedNotified = true;
            }
        }
        
        this.hideBingoAlert();
        this.hideWinnerAlert();
        this.hidePauseAlert();
        
        // Renderizar cartones cuando el juego inicia
        this.renderCards();
        
        if (this.currentRound === 1) {
            this.showPatternButton();
        } else {
            this.hidePatternButton();
        }
    }
    
    handleGamePaused(reason) {
        if (reason === 'admin_pause') {
            this.showPauseAlert();
        } else if (reason === 'bingo_verification') {
            // Mantener alerta de BINGO
        }
        this.gameWasPaused = true;
    }
    
    handleGameEnded() {
        // Solo mostrar estado de espera, NUNCA expirar cartones automáticamente
        console.log('⏹️ Juego terminado - manteniendo cartones válidos');
        this.showWaitingForGame();
        this.showToast('⏸️ Juego terminado. Tus cartones siguen válidos para el próximo juego.');
        this.resetGameAlerts();
        this.hidePatternButton();
        // Resetear flag para próximo juego
        this.gameStartedNotified = false;
    }

    checkGameState() {
        // Esta función ya no es necesaria - Firebase maneja todo el estado
        // Mantenida solo para compatibilidad, pero no hace nada
        if (!window.firebase) {
            console.warn('⚠️ Firebase no disponible - no se puede verificar estado del juego');
            return;
        }
        
        // Firebase listeners manejan todo automáticamente
        return;

        // Firebase maneja todo el estado - esta lógica ya no es necesaria
    }

    checkBingoAlerts() {
        // Las alertas de BINGO ahora se manejan directamente desde Firebase
        // Esta función ya no es necesaria pero se mantiene para compatibilidad
        return;
    }

    handleVerificationResult(result) {
        const userPhone = localStorage.getItem('userPhone');
        
        if (result.isCorrect && result.isWinner) {
            // El jugador actual ganó
            this.showWinnerAlert(result);
            this.showToast(`🏆 ¡Ganaste ${result.typeText}! Premio: BsF ${result.prize}`);
        } else if (result.isCorrect && !result.isWinner) {
            // Otro jugador ganó
            this.showToast(`🏆 ${result.winnerCard} ganó con ${result.typeText}`);
            this.enableAllBingoButtons();
        } else if (!result.isCorrect) {
            // BINGO incorrecto
            this.showToast('❌ BINGO incorrecto. El juego continúa.');
            this.enableAllBingoButtons();
        }
        
        // Manejar fin de juego
        if (result.gameEnded) {
            this.showToast('🏁 Partida finalizada');
        } else if (result.isCorrect && result.isWinner) {
            if (this.currentRound === 1) {
                this.showToast('➡️ Avanzando a Ronda 2 - Cartón Lleno');
            }
        }
    }

    processNewNumber(number, showAnimation = false) {
        if (this.calledNumbers.includes(number)) return;

        this.calledNumbers.push(number);
        this.updateLastNumber(number);
        this.markNumberCalled(number);
        this.autoMarkAllCards(number);

        if (showAnimation) {
            this.showBallAnimation(number);
        }
        
        // Siempre hablar el número, independiente de la animación
        this.speakNumber(number);
    }

    // === UI UPDATES ===
    updateGameInfo() {
        // Obtener premios desde Firebase
        if (window.firebase) {
            const { database, ref, get } = window.firebase;
            
            get(ref(database, 'gameState')).then((snapshot) => {
                const gameState = snapshot.val();
                if (gameState && gameState.prizes) {
                    const roundPrize = this.currentRound === 1 ? 
                        gameState.prizes.round1 || 0 : 
                        gameState.prizes.round2 || 0;
                    
                    document.getElementById('current-prize').textContent = Math.round(roundPrize);
                } else {
                    // Fallback: calcular desde compras verificadas
                    this.calculatePrizeFromSales();
                }
            }).catch(() => {
                // Si falla Firebase, usar fallback
                this.calculatePrizeFromSales();
            });
        } else {
            // Si no hay Firebase, usar fallback
            this.calculatePrizeFromSales();
        }
        
        document.getElementById('current-round').textContent = this.currentRound;
    }
    
    calculatePrizeFromSales() {
        const verifiedPurchases = JSON.parse(localStorage.getItem('verifiedPurchases') || '[]');
        const totalSales = verifiedPurchases.reduce((sum, p) => sum + p.cartones, 0) * 60;
        const roundPrize = this.currentRound === 1 ? totalSales * 0.25 : totalSales * 0.50;
        
        document.getElementById('current-prize').textContent = Math.round(roundPrize);
    }

    updateLastNumber(number) {
        const letter = this.getBingoLetter(number);
        
        console.log('🔄 Actualizando último número:', letter + number);
        
        // Mostrar mini bola en header con delay
        setTimeout(() => {
            this.showMiniBall(letter, number);
        }, 200);
        
        // Actualizar últimos 3 números
        setTimeout(() => {
            this.updateRecentNumbers(letter, number);
        }, 400);
        
        // Actualizar título de la página
        document.title = `🎯 ${letter}${number} - Bingo Chévere`;
        
        // Restaurar título después de 5 segundos
        setTimeout(() => {
            document.title = 'Sala de Juego - Bingo Chévere';
        }, 5000);
    }

    showMiniBall(letter, number) {
        const miniBall = document.getElementById('mini-ball');
        const ballLetter = document.getElementById('mini-ball-letter');
        const ballNumber = document.getElementById('mini-ball-number');
        
        if (!miniBall || !ballLetter || !ballNumber) {
            console.log('⚠️ Elementos de mini-bola no encontrados');
            return;
        }
        
        console.log('🎱 Mostrando mini-bola:', letter + number);
        
        // Ocultar bola anterior si existe
        miniBall.classList.remove('show');
        miniBall.style.display = 'none';
        
        // Limpiar cualquier timeout anterior
        if (window.miniBallTimeout) {
            clearTimeout(window.miniBallTimeout);
        }
        
        setTimeout(() => {
            ballLetter.textContent = letter;
            ballNumber.textContent = number;
            
            miniBall.style.display = 'flex';
            miniBall.style.opacity = '0';
            miniBall.style.transform = 'translate(-50%, -50%) scale(0.5)';
            
            // Forzar reflow
            miniBall.offsetHeight;
            
            miniBall.style.animation = 'ballPop 0.6s ease-out';
            miniBall.classList.add('show');
            
            console.log('✅ Mini-bola mostrada correctamente');
            
            // La bola se mantiene visible hasta el siguiente número
            // Se ocultará automáticamente cuando se muestre la siguiente
        }, 150);
    }

    updateRecentNumbers(letter, number) {
        const recentNumbers = document.querySelectorAll('.recent-number');
        if (!recentNumbers.length) return;
        
        // Obtener los últimos 3 números cantados
        const lastThreeNumbers = this.calledNumbers.slice(-3).map(item => 
            typeof item === 'object' ? item.number : item
        ).filter(num => typeof num === 'number');
        
        console.log('🔄 Actualizando números recientes:', lastThreeNumbers);
        
        // Limpiar todos los números primero
        recentNumbers.forEach(num => {
            num.textContent = '--';
            num.classList.remove('latest');
        });
        
        // Mostrar los últimos 3 números en orden correcto
        lastThreeNumbers.forEach((num, index) => {
            if (recentNumbers[index] && typeof num === 'number') {
                const numLetter = this.getBingoLetter(num);
                recentNumbers[index].textContent = `${numLetter}${num}`;
                recentNumbers[index].style.opacity = '1';
                
                // Marcar el último como más destacado
                if (index === lastThreeNumbers.length - 1) {
                    recentNumbers[index].classList.add('latest');
                }
            }
        });
        
        console.log('✅ Números recientes actualizados correctamente');
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    // === ANIMATIONS ===
    showBallAnimation(number) {
        // Función deshabilitada - solo usar mini bola del header
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    showBingoAlert(data) {
        const alert = document.getElementById('bingo-alert');
        const message = document.getElementById('bingo-message');
        
        message.textContent = `Cartón ${data.cartonId} (${data.phone}) cantó ${data.typeText}. Verificando...`;
        alert.style.display = 'flex';
    }

    hideBingoAlert() {
        const alert = document.getElementById('bingo-alert');
        if (alert) alert.style.display = 'none';
    }

    showWinnerAlert(result) {
        const alert = document.getElementById('winner-alert');
        const message = document.getElementById('winner-message');
        const prize = document.getElementById('winner-prize');
        
        message.textContent = `¡Ganaste con ${result.typeText}!`;
        prize.textContent = `BsF ${result.prize}`;
        alert.style.display = 'flex';
    }

    hideWinnerAlert() {
        const alert = document.getElementById('winner-alert');
        if (alert) alert.style.display = 'none';
    }

    closeWinnerAlert() {
        this.hideWinnerAlert();
    }

    hideGameElements() {
        // Ocultar mini bola
        const miniBall = document.getElementById('mini-ball');
        if (miniBall) miniBall.style.display = 'none';
        
        // Limpiar números recientes
        const recentNumbers = document.querySelectorAll('.recent-number');
        recentNumbers.forEach(num => num.textContent = '--');
    }

    showGameElements() {
        // Los elementos se mostrarán automáticamente cuando lleguen nuevos números
    }

    showPauseAlert() {
        const alert = document.getElementById('pause-alert');
        if (alert) {
            alert.style.display = 'flex';
            this.showToast('⏸️ Juego pausado por el administrador');
        }
    }

    showCancelAlert() {
        this.showToast('❌ Juego cancelado. Cartones expirados.');
        // Mostrar alerta visual más prominente
        const alert = document.getElementById('pause-alert');
        if (alert) {
            const content = alert.querySelector('.pause-content');
            if (content) {
                content.innerHTML = `
                    <h2>❌ JUEGO CANCELADO</h2>
                    <p>El administrador canceló el juego</p>
                    <p class="pause-info">Tus cartones han expirado</p>
                `;
                content.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            }
            alert.style.display = 'flex';
            
            // Ocultar después de 3 segundos
            setTimeout(() => {
                this.hidePauseAlert();
            }, 3000);
        }
    }

    hidePauseAlert() {
        const alert = document.getElementById('pause-alert');
        if (alert) alert.style.display = 'none';
    }

    resetGameAlerts() {
        this.hideBingoAlert();
        this.hideWinnerAlert();
        this.hidePauseAlert();
        // Firebase maneja las alertas - no hay localStorage que limpiar
    }
    
    resetVisuals() {
        // Limpiar números recientes
        const recentNumbers = document.querySelectorAll('.recent-number');
        recentNumbers.forEach(num => {
            num.textContent = '--';
            num.classList.remove('latest');
        });
        
        // Ocultar mini-bola
        const miniBall = document.getElementById('mini-ball');
        if (miniBall) {
            miniBall.style.display = 'none';
            miniBall.classList.remove('show');
        }
        
        // Limpiar historial de números
        const calledCells = document.querySelectorAll('.number-cell.called');
        calledCells.forEach(cell => {
            cell.classList.remove('called');
            cell.style.background = '';
            cell.style.color = '';
            cell.style.transform = '';
        });
        
        console.log('✨ Visuales reseteados para nuevo juego');
    }

    // === HISTORY MODAL ===
    generateNumbersGrid() {
        const grid = document.getElementById('numbers-grid');
        if (!grid) {
            console.log('⚠️ Grid de números no encontrado');
            return;
        }

        grid.innerHTML = '';
        
        const sections = [
            { start: 1, end: 15, letter: 'B' },   // B
            { start: 16, end: 30, letter: 'I' },  // I
            { start: 31, end: 45, letter: 'N' },  // N
            { start: 46, end: 60, letter: 'G' },  // G
            { start: 61, end: 75, letter: 'O' }   // O
        ];

        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'number-section';
            
            // Agregar header de letra
            const headerDiv = document.createElement('div');
            headerDiv.className = 'section-header';
            headerDiv.textContent = section.letter;
            headerDiv.style.cssText = `
                background: #3498db;
                color: white;
                text-align: center;
                font-weight: 900;
                padding: 0.3rem;
                grid-column: 1 / -1;
                border-radius: 4px;
                margin-bottom: 2px;
            `;
            sectionDiv.appendChild(headerDiv);
            
            for (let i = section.start; i <= section.end; i++) {
                const cell = document.createElement('div');
                cell.className = 'number-cell';
                cell.textContent = i;
                cell.id = `num-${i}`;
                
                // Marcar si ya fue cantado
                if (this.calledNumbers.includes(i)) {
                    cell.classList.add('called');
                    cell.style.background = '#3498db';
                    cell.style.color = 'white';
                }
                
                sectionDiv.appendChild(cell);
            }
            
            grid.appendChild(sectionDiv);
        });
        
        console.log('✅ Grid de números generado correctamente');
    }

    markNumberCalled(number) {
        const cell = document.getElementById(`num-${number}`);
        if (cell && !cell.classList.contains('called')) {
            cell.classList.add('called');
            cell.style.transform = 'scale(1.1)';
            cell.style.background = '#3498db';
            cell.style.color = 'white';
            
            // Animación de marcado
            setTimeout(() => {
                cell.style.transform = 'scale(1)';
            }, 300);
            
            console.log('✅ Número marcado en historial:', number);
        } else if (!cell) {
            console.log('⚠️ Celda no encontrada para número:', number);
            // Regenerar grid si no existe
            this.generateNumbersGrid();
            // Intentar marcar de nuevo
            setTimeout(() => {
                const newCell = document.getElementById(`num-${number}`);
                if (newCell) {
                    newCell.classList.add('called');
                    newCell.style.background = '#3498db';
                    newCell.style.color = 'white';
                }
            }, 100);
        }
    }

    showHistory() {
        document.getElementById('history-modal').classList.add('show');
    }

    closeHistory() {
        document.getElementById('history-modal').classList.remove('show');
    }

    // === PATTERN SYSTEM ===
    generateRandomPattern() {
        const patterns = [];
        const patternSize = Math.floor(Math.random() * 7) + 12; // 12-18 casillas
        const maxCells = 20; // Máximo 20 casillas para evitar cartón lleno
        
        // Generar posiciones aleatorias distribuidas
        const usedPositions = new Set();
        
        while (patterns.length < Math.min(patternSize, maxCells)) {
            const row = Math.floor(Math.random() * 5);
            const col = Math.floor(Math.random() * 5);
            const key = `${row}-${col}`;
            
            if (!usedPositions.has(key)) {
                // Evitar concentración en una sola área
                const nearbyCount = this.countNearbyPositions(patterns, row, col);
                if (nearbyCount < 3 || patterns.length > patternSize * 0.7) {
                    patterns.push([row, col]);
                    usedPositions.add(key);
                }
            }
        }
        
        // Validar que no sea cartón lleno (máximo 20 de 25 casillas)
        if (patterns.length >= 21) {
            patterns.splice(20); // Limitar a 20 casillas máximo
        }
        
        return {
            name: `Patrón Aleatorio ${Date.now()}`,
            positions: patterns
        };
    }
    
    countNearbyPositions(positions, row, col) {
        let count = 0;
        for (const [r, c] of positions) {
            const distance = Math.abs(r - row) + Math.abs(c - col);
            if (distance <= 1) count++;
        }
        return count;
    }
    
    loadCurrentPattern() {
        // El patrón se carga automáticamente desde Firebase en handleFirebaseGameState
        if (this.currentPattern && this.currentRound === 1) {
            this.showPatternButton();
        } else {
            this.hidePatternButton();
        }
    }
    
    showPatternButton() {
        const btn = document.querySelector('.pattern-btn');
        if (btn) btn.style.display = 'block';
    }
    
    hidePatternButton() {
        const btn = document.querySelector('.pattern-btn');
        if (btn) btn.style.display = 'none';
    }
    
    showPattern() {
        if (!this.currentPattern) {
            this.showToast('No hay patrón disponible');
            return;
        }
        
        this.renderPatternGrid(this.currentPattern);
        document.getElementById('pattern-modal').classList.add('show');
    }
    
    closePattern() {
        document.getElementById('pattern-modal').classList.remove('show');
    }
    
    renderPatternGrid(pattern) {
        const grid = document.getElementById('pattern-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (let i = 0; i < 25; i++) {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const cell = document.createElement('div');
            cell.className = 'pattern-cell';
            
            const isFree = row === 2 && col === 2; // Centro siempre FREE
            const isInPattern = pattern.positions.some(([r, c]) => r === row && c === col);
            
            if (isFree) {
                cell.classList.add('free');
                cell.textContent = 'FREE';
            } else if (isInPattern) {
                cell.classList.add('active');
                cell.textContent = '✓';
            } else {
                cell.textContent = '';
            }
            
            grid.appendChild(cell);
        }
    }

    // === GAME COMPLETION DETECTION ===
    checkGameCompletion(gameState) {
        // Expirar cartones si el bingo se cierra completamente
        if (gameState.bingoClosed) {
            const hasActiveCards = this.cards.some(card => 
                card.status === 'vigente' || card.status === 'en_uso'
            );
            
            if (hasActiveCards) {
                console.log('🔒 Bingo cerrado - expirando cartones');
                this.markCardsExpired('Bingo cerrado por administrador');
                this.showToast('🔒 Bingo cerrado. Cartones expirados.');
            }
            return;
        }
        
        // Expirar cartones SOLO cuando ambas rondas están completadas
        const hasRound1Winner = gameState.round1Winner || gameState.winners?.round1;
        const hasRound2Winner = gameState.round2Winner || gameState.winners?.round2;
        const bothRoundsCompleted = hasRound1Winner && hasRound2Winner;
        const adminFinalized = gameState.gameFinalized || gameState.bothRoundsCompleted;
        
        if (bothRoundsCompleted || adminFinalized) {
            console.log('🏁 Partida completa (2 rondas) - expirando cartones');
            this.markCardsExpired('Partida completada (2 rondas)');
            this.showToast('🏁 Partida finalizada. Cartones expirados.');
            return;
        }
        
        // Nuevo juego - resetear estado pero mantener cartones vigentes
        if (gameState.gameId && this.currentGameId && gameState.gameId !== this.currentGameId) {
            console.log('🆕 Nuevo juego - cartones siguen vigentes');
            this.calledNumbers = [];
            this.resetVisuals();
            this.cards.forEach(card => card.marked = []);
            this.showToast('🆕 Nueva partida iniciada!');
        }
        
        if (gameState.gameId) {
            this.currentGameId = gameState.gameId;
        }
    }
    
    // === CARD UTILITIES ===
    autoMarkAllCards(number) {
        let hasChanges = false;
        let markedCards = 0;
        
        this.cards.forEach(card => {
            if (card.autoMode) {
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (card.numbers[row][col] === number) {
                            const cellKey = `${row}-${col}`;
                            if (!card.marked.includes(cellKey)) {
                                card.marked.push(cellKey);
                                hasChanges = true;
                                markedCards++;
                            }
                        }
                    }
                }
                
                // AUTO-DETECCIÓN: Verificar si completó patrón/cartón después de marcar
                if (card.autoMode && !card.missedOpportunity) {
                    const hasBingo = this.checkBingo(card);
                    const hasPattern = this.checkPattern(card);
                    
                    if (hasBingo || (hasPattern && this.currentRound === 1)) {
                        console.log(`🎯 AUTO-BINGO DETECTADO en cartón ${card.id}`);
                        setTimeout(() => {
                            this.autoCallBingo(card.id);
                        }, 1000); // Delay para que el usuario vea la marca
                    }
                }
            }
        });

        if (hasChanges) {
            console.log(`Auto-marcado ${this.getBingoLetter(number)}${number} en ${markedCards} cartones`);
            this.saveCards();
            this.renderCards();
            
            // Verificar oportunidades perdidas en modo manual
            this.checkMissedOpportunities();
        }
    }

    markCardsInUse() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (!window.firebase || !userPhone) {
            console.error('❌ No se pueden marcar cartones como en uso - Firebase o teléfono no disponible');
            return;
        }
        
        const { database, ref, get, set } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        // Obtener todos los cartones y marcar los vigentes como en uso
        get(ref(database, `playerCards/${cleanPhone}`)).then((snapshot) => {
            let allCards = snapshot.val() || [];
            let hasChanges = false;
            
            allCards.forEach(card => {
                if (card.status === 'vigente') {
                    card.status = 'en_uso';
                    hasChanges = true;
                }
            });
            
            if (hasChanges) {
                console.log('🎮 Marcando cartones como en uso');
                return set(ref(database, `playerCards/${cleanPhone}`), allCards);
            }
        })
        .then(() => {
            if (this.cards.some(c => c.status === 'vigente')) {
                console.log('✅ Cartones marcados como en uso en Firebase');
                // Los cartones se recargarán automáticamente por el listener de Firebase
            }
        })
        .catch(error => {
            console.error('❌ Error marcando cartones como en uso:', error);
        });
    }

    markCardsExpired(reason = 'Juego completado') {
        // Mantener función original para compatibilidad
        this.markCardsInUseExpired(reason);
    }
    
    markCardsInUseExpired(reason = 'Juego completado') {
        const userPhone = localStorage.getItem('userPhone');
        
        if (!window.firebase || !userPhone) {
            console.error('❌ No se pueden marcar cartones como vencidos');
            return;
        }
        
        const { database, ref, get, set } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        get(ref(database, `playerCards/${cleanPhone}`)).then((snapshot) => {
            let allCards = snapshot.val() || [];
            let hasChanges = false;
            
            allCards.forEach(card => {
                // Solo expirar cartones EN_USO (que estaban jugando)
                if (card.status === 'en_uso') {
                    card.status = 'vencido';
                    card.expiredDate = new Date().toISOString();
                    card.expiredReason = reason;
                    hasChanges = true;
                }
                // Los cartones 'vigente' se mantienen para próximo juego
            });
            
            if (hasChanges) {
                console.log('🗑️ Expirando solo cartones en uso:', reason);
                set(ref(database, `playerCards/${cleanPhone}`), allCards);
                
                // Actualizar cartones locales - solo los en_uso
                this.cards = this.cards.map(card => {
                    if (card.status === 'en_uso') {
                        return {...card, status: 'vencido', expiredDate: new Date().toISOString(), expiredReason: reason};
                    }
                    return card;
                });
                
                // Filtrar cartones activos restantes
                const activeCards = this.cards.filter(c => ['vigente', 'en_uso', 'pendiente_pago'].includes(c.status));
                if (activeCards.length === 0) {
                    this.showAccessBlocked();
                } else {
                    this.showWaitingForGame();
                }
            }
        })
        .catch(error => {
            console.error('❌ Error expirando cartones:', error);
        });
    }

    saveCards() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (!window.firebase) {
            console.error('❌ Firebase no disponible - no se pueden guardar cartones');
            return;
        }
        
        if (!userPhone) {
            console.error('❌ Teléfono de usuario no encontrado');
            return;
        }
        
        this.saveCardsToFirebase(userPhone);
    }
    
    saveCardsToFirebase(phone) {
        const { database, ref, set, get } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        // Obtener todos los cartones del jugador y actualizar solo los activos
        get(ref(database, `playerCards/${cleanPhone}`)).then((snapshot) => {
            let allCards = snapshot.val() || [];
            
            // Actualizar cartones activos en la lista completa
            this.cards.forEach(activeCard => {
                const index = allCards.findIndex(c => c.id === activeCard.id);
                if (index !== -1) {
                    allCards[index] = activeCard;
                }
            });
            
            // Guardar en Firebase
            return set(ref(database, `playerCards/${cleanPhone}`), allCards);
        })
        .then(() => {
            console.log('✅ Cartones guardados en Firebase');
        })
        .catch(error => {
            console.error('❌ Error guardando cartones en Firebase:', error);
        });
    }
    
    // AUTO-CALL BINGO para modo automático
    autoCallBingo(cardId) {
        const card = this.cards.find(c => c.id == cardId);
        if (!card || !card.autoMode || card.missedOpportunity) return;
        
        console.log(`🤖 AUTO-CANTANDO BINGO para cartón ${cardId}`);
        
        // Mostrar alerta de auto-detección
        this.showToast('🤖 ¡BINGO detectado automáticamente! Enviando...');
        
        // Llamar función normal de BINGO
        this.callBingo(cardId);
    }
    
    // Verificar oportunidades perdidas
    checkMissedOpportunities() {
        this.cards.forEach(card => {
            if (card.autoMode || card.missedOpportunity) return; // Solo para modo manual
            
            const hasBingo = this.checkBingo(card);
            const hasPattern = this.checkPattern(card);
            const isComplete = hasBingo || (this.currentRound === 1 && hasPattern);
            
            if (isComplete && card.numbersWhenCompleted) {
                const numbersPassed = this.calledNumbers.length - card.numbersWhenCompleted;
                
                if (numbersPassed >= 2) {
                    console.log(`❌ Cartón ${card.id} perdió la oportunidad (${numbersPassed} números después)`);
                    card.missedOpportunity = true;
                    
                    this.showToast(`❌ Cartón ${card.code || card.id}: Perdiste la oportunidad de ganar`);
                    this.saveCards();
                }
            }
        });
    }
}

// Inicializar
let gameRoom;
document.addEventListener('DOMContentLoaded', () => {
    gameRoom = new GameRoom();
});