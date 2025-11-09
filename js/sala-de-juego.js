// Sala de Juego - Producción
class GameRoom {
    constructor() {
        this.cards = [];
        this.calledNumbers = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.currentPrize = 0;
        this.currentPattern = null;
        
        // SISTEMA DE COLA PARA NÚMEROS
        this.numberQueue = [];
        this.isProcessingQueue = false;
        this.lastProcessedTime = 0;
        this.MIN_INTERVAL = 3000; // 3 segundos mínimo entre números
        
        // SISTEMA PARA EVITAR MENSAJES REPETIDOS
        this.seenWinMessages = new Set(JSON.parse(localStorage.getItem('seenWinMessages') || '[]'));
        
        this.init();
    }

    init() {
        console.log('🎮 Iniciando sala de juego...');
        
        // Esperar a Firebase con reintentos
        this.waitForFirebase(0);
    }
    
    waitForFirebase(attempts) {
        if (window.firebase && window.firebase.database) {
            console.log('✅ Firebase disponible, iniciando componentes...');
            this.generateNumbersGrid();
            this.loadCards();
            this.startGameMonitoring();
            this.loadInitialGameState();
        } else if (attempts < 10) {
            console.log('⏳ Esperando Firebase... intento', attempts + 1);
            setTimeout(() => this.waitForFirebase(attempts + 1), 1000);
        } else {
            console.error('❌ Firebase no disponible después de 10 intentos');
            this.showWaitingState();
        }
    }

    // === CARD MANAGEMENT ===
    loadCards() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (!userPhone) {
            this.showWaitingState();
            return;
        }
        
        if (window.firebase) {
            this.loadCardsFromFirebase(userPhone);
        } else {
            this.showWaitingState();
        }
    }
    

    
    loadCardsFromFirebase(phone) {
        const { database, ref, onValue } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        onValue(ref(database, `playerCards/${cleanPhone}`), (snapshot) => {
            const firebaseCards = snapshot.val();
            if (firebaseCards && Array.isArray(firebaseCards)) {
                this.cards = firebaseCards.filter(card => 
                    card && (card.status === 'vigente' || card.status === 'en_uso')
                );
                
                if (this.cards.length > 0) {
                    this.processLoadedCards();
                    console.log('✅ Cartones cargados:', this.cards.length);
                } else {
                    this.showWaitingState();
                }
            } else {
                this.showWaitingState();
            }
        }, (error) => {
            console.error('Error cargando cartones:', error);
            this.showWaitingState();
        });
    }
    
    processLoadedCards() {
        // Procesar cartones
        this.cards.forEach(card => {
            if (!card.marked) card.marked = [];
            if (card.autoMode === undefined) card.autoMode = true;
            if (!card.id) card.id = Date.now() + Math.random();
        });

        console.log('Cartones procesados:', this.cards.length);
        this.renderCards();
        
        // Auto-marcar si hay números cantados
        if (this.calledNumbers.length > 0) {
            this.cards.forEach(card => {
                if (card.autoMode) {
                    this.autoMarkCard(card);
                }
            });
            this.renderCards();
        }
    }

    showWaitingState() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        
        if (container) container.innerHTML = '';
        if (waitingState) waitingState.style.display = 'block';
    }

    showAccessBlocked() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        const accessBlocked = document.getElementById('access-blocked');
        
        if (container) container.innerHTML = '';
        if (waitingState) waitingState.style.display = 'none';
        if (accessBlocked) accessBlocked.style.display = 'block';
    }

    renderCards() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        
        if (!container) {
            console.error('Container de cartones no encontrado');
            return;
        }
        
        container.innerHTML = '';
        if (waitingState) waitingState.style.display = 'none';
        
        console.log('Renderizando', this.cards.length, 'cartones');

        this.cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        
        if (card.autoMode === undefined) card.autoMode = true;
        
        const cardCode = card.code || `C${card.id}`;
        
        // Header del cartón
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.textContent = cardCode;
        
        // Letras BINGO
        const bingoLetters = document.createElement('div');
        bingoLetters.className = 'bingo-letters';
        ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
            const span = document.createElement('span');
            span.textContent = letter;
            bingoLetters.appendChild(span);
        });
        
        // Grid del cartón
        const cardGrid = document.createElement('div');
        cardGrid.className = 'card-grid';
        
        // Generar celdas
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'card-cell';
                
                const number = card.numbers[row][col];
                const isFree = number === 0;
                const cellKey = `${row}-${col}`;
                const isMarked = card.marked.includes(cellKey) || isFree;
                const wasCalled = this.calledNumbers.includes(number) && !isFree;
                // PATRÓN FIJO VISUAL PARA RONDA 1
                let isPatternCell = false;
                if (this.currentRound === 1) {
                    let patternPositions = [[0,2], [1,2], [3,2], [4,2], [2,0], [2,1], [2,3], [2,4]]; // Fallback
                    
                    if (this.currentPattern && this.currentPattern.positions) {
                        patternPositions = this.currentPattern.positions;
                    }
                    
                    isPatternCell = patternPositions.some(pos => pos[0] === row && pos[1] === col);
                }
                
                if (isMarked) cell.classList.add('marked');
                if (isFree) cell.classList.add('free');
                if (wasCalled) cell.classList.add('called');
                if (isPatternCell) {
                    cell.style.border = '3px solid #9b59b6';
                    cell.style.boxShadow = '0 0 5px rgba(155, 89, 182, 0.5)';
                }
                
                cell.dataset.cardId = card.id;
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.dataset.number = number;
                cell.textContent = isFree ? 'FREE' : number;
                
                // Event listener para marcar celdas
                cell.addEventListener('click', () => {
                    this.toggleCell(card.id, row, col);
                });
                
                cardGrid.appendChild(cell);
            }
        }
        
        // Controles
        const cardControls = document.createElement('div');
        cardControls.className = 'card-controls';
        
        // Selector de modo
        const modeSelector = document.createElement('div');
        modeSelector.className = 'mode-selector';
        
        const autoBtn = document.createElement('button');
        autoBtn.className = `mode-option ${card.autoMode ? 'active' : ''}`;
        autoBtn.setAttribute('data-mode', 'auto');
        autoBtn.textContent = '🤖 Auto';
        autoBtn.addEventListener('click', () => this.setMode(card.id, true));
        
        const manualBtn = document.createElement('button');
        manualBtn.className = `mode-option ${!card.autoMode ? 'active' : ''}`;
        manualBtn.setAttribute('data-mode', 'manual');
        manualBtn.textContent = '✋ Manual';
        manualBtn.addEventListener('click', () => this.setMode(card.id, false));
        
        // Botón BINGO
        const bingoBtn = document.createElement('button');
        const hasPattern = this.currentRound === 1 && this.checkPattern(card);
        const hasFullBingo = this.currentRound === 2 && this.checkBingo(card);
        const canCallBingo = hasPattern || hasFullBingo;
        
        bingoBtn.className = `bingo-btn ${canCallBingo ? 'has-bingo' : ''}`;
        if (this.currentRound === 1) {
            bingoBtn.textContent = hasPattern ? '🎯 PATRÓN!' : 'PATRÓN';
            if (hasPattern) bingoBtn.classList.add('has-pattern');
        } else {
            bingoBtn.textContent = hasFullBingo ? '🏆 BINGO!' : 'BINGO';
        }
        bingoBtn.disabled = !canCallBingo;
        bingoBtn.addEventListener('click', () => this.callBingo(card.id));
        
        modeSelector.appendChild(autoBtn);
        modeSelector.appendChild(manualBtn);
        cardControls.appendChild(modeSelector);
        cardControls.appendChild(bingoBtn);
        
        cardDiv.appendChild(cardHeader);
        cardDiv.appendChild(bingoLetters);
        cardDiv.appendChild(cardGrid);
        cardDiv.appendChild(cardControls);

        return cardDiv;
    }

    toggleCell(cardId, row, col) {
        const card = this.cards.find(c => c.id == cardId);
        if (!card) return;

        if (card.autoMode) {
            this.showToast('Desactiva modo automático para marcar manualmente');
            return;
        }

        const number = card.numbers[row][col];
        if (!number || number === 0) return;

        const cellKey = `${row}-${col}`;
        const isMarked = card.marked.includes(cellKey);
        
        if (isMarked) {
            card.marked = card.marked.filter(key => key !== cellKey);
        } else {
            card.marked.push(cellKey);
        }
        
        this.renderCards();
    }

    setMode(cardId, isAuto) {
        const card = this.cards.find(c => c.id == cardId);
        if (!card || card.autoMode === isAuto) return;

        card.autoMode = isAuto;
        
        if (card.autoMode) {
            this.autoMarkCard(card);
            this.showToast('Modo automático activado');
        } else {
            this.showToast('Modo manual activado');
        }

        this.renderCards();
    }

    autoMarkCard(card) {
        if (!card.marked) card.marked = [];
        let hasNewMarks = false;
        
        this.calledNumbers.forEach(number => {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    if (card.numbers[row][col] === number) {
                        const cellKey = `${row}-${col}`;
                        if (!card.marked.includes(cellKey)) {
                            card.marked.push(cellKey);
                            hasNewMarks = true;
                            console.log('✅ Marcado automático:', number, 'en', card.code, 'posición', cellKey);
                        }
                    }
                }
            }
        });
        
        // Marcar FREE automáticamente
        const freeKey = '2-2';
        if (!card.marked.includes(freeKey)) {
            card.marked.push(freeKey);
        }
        
        return hasNewMarks;
    }

    // === BINGO LOGIC ===
    checkBingo(card) {
        if (!card.marked) return false;
        
        if (this.currentRound === 1) {
            // Verificar patrón en ronda 1
            return this.checkPattern(card);
        } else {
            // Verificar cartón lleno en ronda 2
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
    }
    
    checkPattern(card) {
        if (!card.marked) return false;
        
        // USAR PATRÓN FIJO DE LA PARTIDA
        let patternPositions = [[0,2], [1,2], [3,2], [4,2], [2,0], [2,1], [2,3], [2,4]]; // Fallback
        
        if (this.currentPattern && this.currentPattern.positions) {
            patternPositions = this.currentPattern.positions;
        }
        
        for (const [row, col] of patternPositions) {
            const cellKey = `${row}-${col}`;
            const isFree = card.numbers[row][col] === 0;
            // NO usar el FREE en patrones
            if (isFree) continue;
            if (!card.marked.includes(cellKey)) {
                return false;
            }
        }
        return true;
    }

    callBingo(cardId) {
        const card = this.cards.find(c => c.id == cardId);
        if (!card) return;

        const hasBingo = this.checkBingo(card);
        if (!hasBingo) {
            this.showToast('Este cartón no tiene BINGO completo');
            return;
        }

        this.showToast('🏆 ¡BINGO! Enviando para verificación...');
        this.showBingoAlert();
        
        // Enviar a Firebase para verificación
        if (window.firebase) {
            const userPhone = localStorage.getItem('userPhone');
            const bingoData = {
                cartonId: card.code,
                phone: userPhone,
                type: this.currentRound === 1 ? 'PATRON' : 'CARTON_LLENO',
                typeText: this.currentRound === 1 ? 'Patrón' : 'Cartón Lleno',
                round: this.currentRound,
                timestamp: Date.now(),
                gameId: Date.now()
            };
            
            const { database, ref, set } = window.firebase;
            set(ref(database, 'pendingBingoVerification'), bingoData)
                .then(() => console.log('✅ BINGO enviado para verificación'))
                .catch(error => console.error('❌ Error enviando BINGO:', error));
        }
    }

    // === GAME MONITORING ===
    loadInitialGameState() {
        if (!window.firebase) return;
        
        const { database, ref, get } = window.firebase;
        
        // Cargar estado del juego
        get(ref(database, 'gameState')).then((snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.gameActive = gameState.gameActive || false;
                this.currentRound = gameState.currentRound || 1;
                this.currentPattern = gameState.currentPattern;
                console.log('✅ Estado del juego cargado:', gameState);
            }
            this.updateGameInfo();
        });
        
        // Cargar números desde calledNumbersList (fuente principal)
        get(ref(database, 'calledNumbersList')).then((snapshot) => {
            const numbersList = snapshot.val();
            if (numbersList) {
                // Convertir a array ordenado por timestamp
                const sortedNumbers = Object.values(numbersList)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map(entry => entry.number);
                
                this.calledNumbers = [...sortedNumbers];
                console.log('✅ Números cargados desde calledNumbersList:', this.calledNumbers.length);
                this.processExistingNumbers();
            } else {
                // Fallback a calledNumbers si calledNumbersList no existe
                get(ref(database, 'calledNumbers')).then((snapshot) => {
                    const numbers = snapshot.val();
                    if (numbers && Array.isArray(numbers)) {
                        this.calledNumbers = [...numbers];
                        console.log('✅ Fallback: números cargados desde calledNumbers:', this.calledNumbers.length);
                        this.processExistingNumbers();
                    }
                });
            }
        });
    }

    processExistingNumbers() {
        console.log('🔄 Procesando números existentes:', this.calledNumbers.length);
        
        // Regenerar grid de historial
        this.generateNumbersGrid();
        
        // Mostrar último número SIN VOZ (números ya cantados)
        if (this.calledNumbers.length > 0) {
            const lastNumber = this.calledNumbers[this.calledNumbers.length - 1];
            this.updateCurrentNumber(lastNumber);
        }
        
        // Auto-marcar cartones solo si hay números cantados
        if (this.calledNumbers.length > 0) {
            this.cards.forEach(card => {
                if (card.autoMode) {
                    const hasNewMarks = this.autoMarkCard(card);
                    if (hasNewMarks) {
                        console.log('✅ Cartón auto-marcado:', card.code);
                    }
                }
            });
        }
        this.renderCards();
    }

    startGameMonitoring() {
        if (window.firebase) {
            this.initFirebaseListeners();
        }
    }

    initFirebaseListeners() {
        if (!window.firebase) return;
        
        const { database, ref, onValue } = window.firebase;
        
        // Escuchar calledNumbersList (fuente principal)
        onValue(ref(database, 'calledNumbersList'), (snapshot) => {
            const numbersList = snapshot.val();
            if (numbersList) {
                // Convertir a array ordenado por timestamp
                const sortedNumbers = Object.values(numbersList)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map(entry => entry.number);
                
                const newNumbers = sortedNumbers.filter(num => !this.calledNumbers.includes(num));
                if (newNumbers.length > 0) {
                    console.log('🔥 Nuevos números desde calledNumbersList:', newNumbers);
                    // PROCESAMIENTO INSTANTÁNEO - Sin cola
                    newNumbers.forEach(number => {
                        this.processNewNumberInstantly(number);
                    });
                }
                
                // Actualizar lista completa
                this.calledNumbers = [...sortedNumbers];
                this.generateNumbersGrid();
            }
        });
        
        // Mantener compatibilidad con calledNumbers (fallback)
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            let firebaseNumbers = snapshot.val();
            if (firebaseNumbers && Array.isArray(firebaseNumbers)) {
                const newNumbers = firebaseNumbers.filter(num => !this.calledNumbers.includes(num));
                if (newNumbers.length > 0 && this.calledNumbers.length === 0) {
                    // Solo usar como fallback si calledNumbersList está vacío
                    console.log('🔥 Fallback: usando calledNumbers');
                    // PROCESAMIENTO INSTANTÁNEO - Sin cola
                    newNumbers.forEach(number => {
                        this.processNewNumberInstantly(number);
                    });
                    this.calledNumbers = [...firebaseNumbers];
                    this.generateNumbersGrid();
                }
            }
        });
        
        // Escuchar estado del juego
        onValue(ref(database, 'gameState'), (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.gameActive = gameState.gameActive || false;
                this.currentRound = gameState.currentRound || 1;
                
                // USAR PATRÓN FIJO DE LA PARTIDA
                if (gameState.fixedPattern) {
                    this.currentPattern = gameState.fixedPattern;
                    console.log('🎯 Patrón fijo cargado:', this.currentPattern);
                } else {
                    this.currentPattern = null;
                }
                
                this.updateGameInfo();
                
                // Mostrar alertas si es necesario
                if (gameState.isPaused) {
                    this.showPauseAlert();
                } else {
                    this.hidePauseAlert();
                }
            }
        });
        
        // Escuchar verificaciones de BINGO
        onValue(ref(database, 'bingoVerificationResult'), (snapshot) => {
            const result = snapshot.val();
            if (result) {
                this.handleBingoVerification(result);
                
                // Limpiar el resultado después de procesarlo para evitar repeticiones
                setTimeout(() => {
                    const { database, ref, set } = window.firebase;
                    set(ref(database, 'bingoVerificationResult'), null);
                }, 2000);
            }
        });
        
        // Escuchar reinicio de Ronda 2
        onValue(ref(database, 'roundTwoReset'), (snapshot) => {
            const resetData = snapshot.val();
            if (resetData && resetData.reset) {
                console.log('🔄 Detectado reinicio de Ronda 2');
                this.handleRoundTwoReset();
            }
        });
        
        console.log('✅ Firebase listeners iniciados');
        
        // Debug: mostrar estado cada 10 segundos
        setInterval(() => {
            console.log('🔍 Estado actual:', {
                gameActive: this.gameActive,
                currentRound: this.currentRound,
                calledNumbers: this.calledNumbers.length,
                cards: this.cards.length
            });
        }, 10000);
    }

    updateCurrentNumber(number) {
        const currentNumberEl = document.getElementById('current-number');
        if (currentNumberEl) {
            const letter = this.getBingoLetter(number);
            currentNumberEl.textContent = `${letter}${number}`;
            currentNumberEl.classList.add('updated');
            
            // Remover clase después de animación
            setTimeout(() => {
                currentNumberEl.classList.remove('updated');
            }, 600);
        }
    }

    // SISTEMA DE COLA PARA CONTROLAR VELOCIDAD
    addNumbersToQueue(numbers) {
        numbers.forEach(num => {
            if (!this.numberQueue.includes(num)) {
                this.numberQueue.push(num);
                console.log('➕ Número agregado a cola:', num);
            }
        });
        
        // Iniciar procesamiento si no está activo
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        if (this.isProcessingQueue || this.numberQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        console.log('🔄 Iniciando procesamiento de cola:', this.numberQueue.length, 'números');
        
        while (this.numberQueue.length > 0) {
            const currentTime = Date.now();
            const timeSinceLastProcess = currentTime - this.lastProcessedTime;
            
            // Esperar si no ha pasado suficiente tiempo
            if (this.lastProcessedTime > 0 && timeSinceLastProcess < this.MIN_INTERVAL) {
                const waitTime = this.MIN_INTERVAL - timeSinceLastProcess;
                console.log('⏳ Esperando', waitTime, 'ms antes del próximo número');
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            const number = this.numberQueue.shift();
            console.log('📢 Procesando número de cola:', number);
            
            this.processNewNumber(number);
            this.lastProcessedTime = Date.now();
        }
        
        this.isProcessingQueue = false;
        console.log('✅ Cola procesada completamente');
    }

    processNewNumberInstantly(number) {
        console.log('⚡ PROCESANDO INSTANTÁNEO:', number);
        
        // CANTAR NÚMERO CON VOZ
        this.callNumberWithVoice(number);
        
        // Actualizar header inmediatamente
        this.updateCurrentNumber(number);
        
        // Marcar en historial inmediatamente
        this.markNumberCalled(number);
        
        // AUTO-MARCAR CARTONES INMEDIATAMENTE
        let cardsUpdated = 0;
        this.cards.forEach(card => {
            if (card.autoMode) {
                const hasNewMarks = this.autoMarkCardInstantly(card, number);
                if (hasNewMarks) cardsUpdated++;
            }
        });
        
        console.log('⚡ Cartones marcados instantáneamente:', cardsUpdated);
        
        // Re-renderizar inmediatamente
        this.renderCards();
    }
    
    autoMarkCardInstantly(card, newNumber) {
        if (!card.marked) card.marked = [];
        let hasNewMarks = false;
        
        // Marcar solo el nuevo número si coincide
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (card.numbers[row][col] === newNumber) {
                    const cellKey = `${row}-${col}`;
                    if (!card.marked.includes(cellKey)) {
                        card.marked.push(cellKey);
                        hasNewMarks = true;
                        console.log('⚡ MARCADO INSTANTÁNEO:', newNumber, 'en', card.code, 'posición', cellKey);
                    }
                }
            }
        }
        
        return hasNewMarks;
    }
    
    processNewNumber(number) {
        console.log('📢 Procesando nuevo número:', number, 'Ya cantados:', this.calledNumbers.length);
        
        // CANTAR NÚMERO CON VOZ MEJORADA
        this.callNumberWithVoice(number);
        
        // Actualizar header con número actual
        this.updateCurrentNumber(number);
        
        // Marcar en historial
        this.markNumberCalled(number);
        
        // Auto-marcar todos los cartones
        let cardsUpdated = 0;
        this.cards.forEach(card => {
            if (card.autoMode) {
                const hasNewMarks = this.autoMarkCard(card);
                if (hasNewMarks) cardsUpdated++;
            }
        });
        
        console.log('✅ Cartones actualizados:', cardsUpdated);
        
        // Re-renderizar cartones
        this.renderCards();
    }

    updateGameInfo() {
        const roundElement = document.getElementById('current-round');
        const prizeElement = document.getElementById('current-prize');
        
        if (roundElement) roundElement.textContent = this.currentRound;
        
        // Calcular premio real desde Firebase
        if (window.firebase && prizeElement) {
            const { database, ref, onValue } = window.firebase;
            onValue(ref(database, 'purchases'), (snapshot) => {
                const purchases = snapshot.val();
                if (purchases) {
                    const verified = Object.values(purchases).filter(p => p.status === 'verified');
                    const totalCartones = verified.reduce((sum, p) => sum + p.cartones, 0);
                    const totalRecaudado = totalCartones * 60;
                    const totalParaPremios = totalRecaudado * 0.75;
                    const roundPrize = this.currentRound === 1 ? totalParaPremios * 0.25 : totalParaPremios * 0.75;
                    prizeElement.textContent = Math.round(roundPrize);
                }
            });
        }
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }
    
    // Función MEJORADA para cantar números con voz cristalina
    callNumberWithVoice(number) {
        if (!('speechSynthesis' in window)) {
            console.log('Síntesis de voz no disponible');
            return;
        }
        
        const letter = this.getBingoLetter(number);
        const numberCall = `${letter} ${number}`;
        
        console.log('🔊 Cantando con voz mejorada:', numberCall);
        
        // Limpiar cola de voz anterior
        speechSynthesis.cancel();
        
        // Voz principal mejorada
        const utterance = new SpeechSynthesisUtterance(numberCall);
        utterance.lang = 'es-ES';
        utterance.rate = 0.8;
        utterance.volume = 1;
        utterance.pitch = 1;
        
        // Buscar voz en español si está disponible
        const voices = speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang.includes('es'));
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }
        
        speechSynthesis.speak(utterance);
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.style.display = 'block';
            
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }

    // === HISTORY MODAL ===
    generateNumbersGrid() {
        const grid = document.getElementById('numbers-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        // Crear grid simple del 1 al 75
        const gridContainer = document.createElement('div');
        gridContainer.style.display = 'grid';
        gridContainer.style.gridTemplateColumns = 'repeat(10, 1fr)';
        gridContainer.style.gap = '3px';
        gridContainer.style.padding = '0.3rem';
        
        for (let i = 1; i <= 75; i++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = i;
            cell.id = `num-${i}`;
            cell.style.aspectRatio = '1';
            cell.style.background = '#ecf0f1';
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            cell.style.fontSize = '0.75rem';
            cell.style.fontWeight = '600';
            cell.style.color = '#7f8c8d';
            cell.style.borderRadius = '4px';
            cell.style.transition = 'all 0.3s ease';
            
            if (this.calledNumbers.includes(i)) {
                cell.classList.add('called');
                cell.style.background = '#3498db';
                cell.style.color = 'white';
                cell.style.transform = 'scale(1.05)';
                cell.style.border = '2px solid #2980b9';
                cell.style.boxShadow = '0 2px 8px rgba(52,152,219,0.4)';
                cell.style.fontWeight = '900';
            }
            
            gridContainer.appendChild(cell);
        }
        
        grid.appendChild(gridContainer);
    }

    markNumberCalled(number) {
        const cell = document.getElementById(`num-${number}`);
        if (cell && !cell.classList.contains('called')) {
            cell.classList.add('called');
            cell.style.background = '#3498db';
            cell.style.color = 'white';
            cell.style.transform = 'scale(1.05)';
            cell.style.border = '2px solid #2980b9';
            cell.style.boxShadow = '0 2px 8px rgba(52,152,219,0.4)';
            cell.style.fontWeight = '900';
        }
    }

    showHistory() {
        const modal = document.getElementById('history-modal');
        if (modal) modal.classList.add('show');
    }

    closeHistory() {
        const modal = document.getElementById('history-modal');
        if (modal) modal.classList.remove('show');
    }

    showPattern() {
        if (this.currentRound !== 1) {
            this.showToast('Patrón solo disponible en Ronda 1');
            return;
        }
        
        // USAR PATRÓN FIJO DE LA PARTIDA
        let patternPositions = [];
        let patternName = 'Patrón de la Partida';
        
        if (this.currentPattern && this.currentPattern.positions) {
            patternPositions = this.currentPattern.positions;
            patternName = this.currentPattern.name || 'Patrón Fijo';
        } else {
            // Patrón por defecto: Cruz sin centro
            patternPositions = [[0,2], [1,2], [3,2], [4,2], [2,0], [2,1], [2,3], [2,4]];
            patternName = 'Cruz Central (Por defecto)';
        }
        
        const modal = document.getElementById('pattern-modal');
        const grid = document.getElementById('pattern-grid');
        
        // Actualizar título del modal
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.textContent = `🎯 ${patternName}`;
        }
        
        if (grid) {
            grid.innerHTML = '';
            
            // Crear grid 5x5
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'pattern-cell';
                    
                    if (row === 2 && col === 2) {
                        cell.classList.add('free');
                        cell.textContent = 'FREE';
                    } else {
                        // Verificar si esta posición está en el patrón FIJO
                        const isActive = patternPositions.some(pos => pos[0] === row && pos[1] === col);
                        if (isActive) {
                            cell.classList.add('active');
                        }
                        cell.textContent = (row * 5 + col + 1).toString();
                    }
                    
                    grid.appendChild(cell);
                }
            }
        }
        
        if (modal) modal.classList.add('show');
    }

    closePattern() {
        const modal = document.getElementById('pattern-modal');
        if (modal) modal.classList.remove('show');
    }
    
    // === ALERTAS Y MODALES ===

    
    showBingoAlert() {
        const alert = document.getElementById('bingo-alert');
        if (alert) {
            alert.style.display = 'flex';
        }
    }
    
    hideBingoAlert() {
        const alert = document.getElementById('bingo-alert');
        if (alert) {
            alert.style.display = 'none';
        }
    }
    
    showPauseAlert() {
        const alert = document.getElementById('pause-alert');
        if (alert) {
            alert.style.display = 'flex';
        }
    }
    
    hidePauseAlert() {
        const alert = document.getElementById('pause-alert');
        if (alert) {
            alert.style.display = 'none';
        }
    }
    
    showWinnerAlert(message, prize, messageId = null) {
        const alert = document.getElementById('winner-alert');
        const messageEl = document.getElementById('winner-message');
        const prizeEl = document.getElementById('winner-prize');
        
        if (alert && messageEl && prizeEl) {
            messageEl.textContent = message;
            prizeEl.textContent = `BsF ${prize}`;
            alert.style.display = 'flex';
            
            // Guardar ID del mensaje si se proporciona
            if (messageId) {
                alert.dataset.messageId = messageId;
            }
        }
    }
    
    closeWinnerAlert() {
        const alert = document.getElementById('winner-alert');
        if (alert) {
            // Marcar mensaje como visto antes de cerrar
            const messageId = alert.dataset.messageId;
            if (messageId) {
                this.seenWinMessages.add(messageId);
                localStorage.setItem('seenWinMessages', JSON.stringify([...this.seenWinMessages]));
                console.log('✅ Mensaje de victoria marcado como visto:', messageId);
                
                // Limpiar también el resultado de Firebase
                if (window.firebase) {
                    const { database, ref, set } = window.firebase;
                    set(ref(database, 'bingoVerificationResult'), null);
                }
            }
            
            alert.style.display = 'none';
            delete alert.dataset.messageId;
        }
    }
    
    handleBingoVerification(result) {
        this.hideBingoAlert();
        
        if (result.isWinner) {
            // Crear ID estable basado en datos del resultado (sin timestamp)
            const messageId = `${result.typeText}_${result.prize}_${result.winnerCard || 'unknown'}`;
            
            // Solo mostrar si no se ha visto antes
            if (!this.seenWinMessages.has(messageId)) {
                this.showWinnerAlert(
                    `¡Felicitaciones! Has ganado ${result.typeText}`,
                    result.prize || 0,
                    messageId
                );
            } else {
                console.log('✅ Mensaje de victoria ya visto, no mostrando:', messageId);
            }
        } else {
            this.showToast('BINGO incorrecto. El juego continúa.');
        }
    }
    
    handleRoundTwoReset() {
        console.log('🔄 Procesando reinicio completo de Ronda 2...');
        
        // LIMPIAR COMPLETAMENTE COLA DE NÚMEROS
        this.numberQueue = [];
        this.isProcessingQueue = false;
        this.lastProcessedTime = 0;
        
        // LIMPIAR COMPLETAMENTE números cantados
        this.calledNumbers = [];
        
        // RESETEAR TODOS LOS CARTONES (solo FREE marcado)
        this.cards.forEach(card => {
            card.marked = ['2-2']; // Solo FREE en posición centro
            card.round = 2; // Marcar como Ronda 2
            card.resetTimestamp = Date.now();
        });
        
        // REGENERAR GRID DE HISTORIAL (completamente vacío)
        this.generateNumbersGrid();
        
        // LIMPIAR NÚMERO ACTUAL
        const currentNumber = document.getElementById('current-number');
        if (currentNumber) {
            currentNumber.textContent = '--';
        }
        
        // ACTUALIZAR RONDA EN UI
        const roundElement = document.getElementById('current-round');
        if (roundElement) {
            roundElement.textContent = '2';
        }
        
        // RE-RENDERIZAR CARTONES COMPLETAMENTE
        this.renderCards();
        
        // MOSTRAR MENSAJE INFORMATIVO
        this.showToast('🔄 RONDA 2 INICIADA - Objetivo: Cartón lleno | Números desde cero');
        
        // Limpiar la señal de reset en Firebase (opcional)
        setTimeout(() => {
            if (window.firebase) {
                const { database, ref, set } = window.firebase;
                set(ref(database, 'roundTwoReset'), null);
            }
        }, 3000);
        
        console.log('✅ Reinicio completo de Ronda 2 terminado - Sistema listo para cartón lleno');
    }
}

// Inicialización del juego
let gameRoom = null;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎮 Iniciando GameRoom...');
    
    // Verificar si hay teléfono de usuario
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) {
        console.log('⚠️ No hay teléfono de usuario, redirigiendo...');
        window.location.href = 'index.html';
        return;
    }
    
    gameRoom = new GameRoom();
    console.log('✅ GameRoom inicializado');
    
    // Debug global
    window.gameRoomDebug = () => {
        console.log('🔍 Debug GameRoom:', {
            gameActive: gameRoom.gameActive,
            currentRound: gameRoom.currentRound,
            calledNumbers: gameRoom.calledNumbers.length,
            cards: gameRoom.cards.length,
            firebase: !!window.firebase,
            userPhone: localStorage.getItem('userPhone')
        });
    };
    
    // Debug cada 30 segundos
    setInterval(() => {
        if (gameRoom) {
            console.log('🔍 Estado actual:', {
                gameActive: gameRoom.gameActive,
                round: gameRoom.currentRound,
                numbers: gameRoom.calledNumbers.length,
                cards: gameRoom.cards.length,
                queue: gameRoom.numberQueue.length,
                processing: gameRoom.isProcessingQueue
            });
        }
    }, 30000);
});

// Funciones globales para los modales
window.gameRoom = {
    showHistory: () => gameRoom?.showHistory(),
    closeHistory: () => gameRoom?.closeHistory(),
    showPattern: () => gameRoom?.showPattern(),
    closePattern: () => gameRoom?.closePattern(),
    closeWinnerAlert: () => gameRoom?.closeWinnerAlert()
};