// Sala de Juego Nueva - Sistema Completo
class GameRoom {
    constructor() {
        this.cards = [];
        this.calledNumbers = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.currentPrize = 450;
        this.audioEnabled = true;
        
        this.init();
    }

    init() {
        console.log('🎮 Iniciando nueva sala de juego...');
        this.setupAudio();
        this.loadCards();
        this.generateNumbersGrid();
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
            this.loadVoices();
            
            // Cargar voces cuando estén disponibles
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
            
            // Activar audio en cualquier interacción del usuario
            const activateEvents = ['touchstart', 'click', 'keydown', 'mousedown'];
            activateEvents.forEach(event => {
                document.addEventListener(event, () => this.activateAudio(), { once: true });
            });
            
            // Forzar activación después de 2 segundos
            setTimeout(() => this.activateAudio(), 2000);
        }
    }

    loadVoices() {
        this.voices = this.speech.getVoices();
        
        // Buscar voz en español o usar la primera disponible
        this.spanishVoice = this.voices.find(v => 
            v.lang.startsWith('es') || 
            v.name.toLowerCase().includes('spanish') ||
            v.name.toLowerCase().includes('español')
        ) || this.voices[0];
        
        console.log('Voces disponibles:', this.voices.length);
        console.log('Voz seleccionada:', this.spanishVoice?.name || 'Ninguna');
    }

    activateAudio() {
        if (this.speech && !this.audioActivated) {
            try {
                // Cancelar cualquier síntesis anterior
                this.speech.cancel();
                
                // Crear utterance silencioso para activar
                const utterance = new SpeechSynthesisUtterance(' ');
                utterance.volume = 0.01;
                utterance.rate = 10;
                
                this.speech.speak(utterance);
                this.audioActivated = true;
                
                console.log('Audio activado correctamente');
            } catch (error) {
                console.error('Error activando audio:', error);
            }
        }
    }

    speakNumber(number) {
        if (!this.audioEnabled || !this.speech) {
            console.log('Audio deshabilitado o no disponible');
            return;
        }

        try {
            // Asegurar que el audio esté activado
            if (!this.audioActivated) {
                this.activateAudio();
            }
            
            // Cancelar síntesis anterior
            this.speech.cancel();
            
            const letter = this.getBingoLetter(number);
            const text = `${letter} ${number}`;
            
            console.log('Hablando número:', text);
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configurar voz
            if (this.spanishVoice) {
                utterance.voice = this.spanishVoice;
            }
            
            // Configuración optimizada para móviles y PC
            utterance.rate = 0.7;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.lang = 'es-ES';
            
            // Eventos para debug
            utterance.onstart = () => console.log('Iniciando síntesis de:', text);
            utterance.onend = () => console.log('Terminó síntesis de:', text);
            utterance.onerror = (e) => console.error('Error en síntesis:', e);
            
            // Hablar con retry en caso de fallo
            this.speech.speak(utterance);
            
            // Backup: intentar de nuevo si no funciona
            setTimeout(() => {
                if (this.speech.speaking === false && this.speech.pending === false) {
                    console.log('Reintentando síntesis...');
                    this.speech.speak(utterance);
                }
            }, 500);
            
        } catch (error) {
            console.error('Error en speakNumber:', error);
        }
    }

    // === CARD MANAGEMENT ===
    loadCards() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (window.firebase && userPhone) {
            this.loadCardsFromFirebase(userPhone);
        } else {
            this.loadCardsFromLocalStorage();
        }
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
                this.loadCardsFromLocalStorage();
            }
        });
    }
    
    loadCardsFromLocalStorage() {
        const savedCards = localStorage.getItem('playerCards');
        if (savedCards) {
            const allCards = JSON.parse(savedCards);
            this.cards = allCards.filter(card => 
                card.status === 'vigente' || card.status === 'en_uso'
            );
        }
        
        this.processLoadedCards();
    }
    
    processLoadedCards() {
        // Asegurar que todos los cartones tengan la estructura correcta
        this.cards.forEach(card => {
            if (!card.marked) card.marked = [];
            if (card.autoMode === undefined) card.autoMode = true;
            if (!card.id) card.id = Date.now() + Math.random();
        });

        console.log('Cartones procesados:', this.cards.length);
        console.log('Estados de cartones:', this.cards.map(c => ({id: c.id, status: c.status})));

        if (this.cards.length === 0) {
            this.showWaitingState();
        } else {
            this.renderCards();
        }
    }

    showWaitingState() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        
        container.innerHTML = '';
        waitingState.style.display = 'block';
    }

    renderCards() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        
        if (!container) return;
        
        container.innerHTML = '';
        waitingState.style.display = 'none';

        this.cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        
        // Asegurar autoMode
        if (card.autoMode === undefined) card.autoMode = true;
        
        const cardCode = card.code || `C${card.id}`;
        const hasBingo = this.checkBingo(card);
        const hasLine = this.checkLine(card);
        const canCallBingo = hasBingo || hasLine;
        
        let bingoClass = '';
        let bingoText = 'BINGO';
        
        if (hasBingo) {
            bingoClass = 'has-bingo';
            bingoText = '🏆 CARTÓN LLENO';
        } else if (hasLine) {
            bingoClass = 'has-line';
            bingoText = this.currentRound === 1 ? '🎯 PATRÓN' : '📏 LÍNEA';
        }
        
        // Crear elementos manualmente para evitar problemas con onclick
        cardDiv.innerHTML = `
            <div class="card-header">ID-${cardCode}</div>
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
                        Automático
                    </button>
                    <button class="mode-option ${!card.autoMode ? 'active' : ''}" data-card-id="${card.id}" data-mode="manual">
                        Manual
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

    generateCardGrid(card) {
        return Array.from({ length: 25 }, (_, i) => {
            const row = Math.floor(i / 5);
            const col = i % 5;
            const number = card.numbers[row][col];
            const isFree = number === 0;
            const isMarked = card.marked.includes(`${row}-${col}`) || isFree;
            
            return `<div class="card-cell ${isMarked ? 'marked' : ''} ${isFree ? 'free' : ''}" 
                         data-card-id="${card.id}" data-row="${row}" data-col="${col}" data-number="${number}">
                        ${isFree ? 'FREE' : number}
                    </div>`;
        }).join('');
    }

    addCardEventListeners(cardDiv, card) {
        // Event listeners para botones de modo
        const modeButtons = cardDiv.querySelectorAll('.mode-option');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardId = e.target.dataset.cardId;
                const isAuto = e.target.dataset.mode === 'auto';
                console.log('Mode button clicked:', cardId, isAuto);
                this.setMode(cardId, isAuto);
            });
        });

        // Event listener para botón BINGO
        const bingoBtn = cardDiv.querySelector('.bingo-btn');
        if (bingoBtn) {
            bingoBtn.addEventListener('click', (e) => {
                const cardId = e.target.dataset.cardId;
                console.log('Bingo button clicked:', cardId);
                this.callBingo(cardId);
            });
        }

        // Event listeners para celdas
        const cells = cardDiv.querySelectorAll('.card-cell');
        cells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                const cardId = e.target.dataset.cardId;
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                console.log('Cell clicked:', cardId, row, col);
                this.toggleCell(cardId, row, col);
            });
        });
    }

    toggleCell(cardId, row, col) {
        console.log('toggleCell called with:', cardId, row, col);
        const card = this.cards.find(c => c.id == cardId);
        if (!card) {
            console.log('Card not found:', cardId, 'Available cards:', this.cards.map(c => c.id));
            return;
        }

        if (card.autoMode) {
            this.showToast('Desactiva modo automático para marcar manualmente');
            return;
        }

        const number = card.numbers[row][col];
        if (number === 0) return;

        if (!this.calledNumbers.includes(number)) {
            this.showToast('Este número no ha sido cantado');
            return;
        }

        const cellKey = `${row}-${col}`;
        const index = card.marked.indexOf(cellKey);
        
        if (index > -1) {
            card.marked.splice(index, 1);
        } else {
            card.marked.push(cellKey);
        }

        this.saveCards();
        this.renderCards();
    }

    setMode(cardId, isAuto) {
        console.log('setMode called with:', cardId, isAuto);
        const card = this.cards.find(c => c.id == cardId);
        if (!card) {
            console.log('Card not found for setMode:', cardId, 'Available cards:', this.cards.map(c => c.id));
            return;
        }

        console.log('Card found, changing mode from', card.autoMode, 'to', isAuto);
        card.autoMode = isAuto;
        
        if (card.autoMode) {
            this.autoMarkCard(card);
            this.showToast('✅ Modo automático activado');
        } else {
            this.showToast('✋ Modo manual activado');
        }

        this.saveCards();
        this.renderCards();
    }

    autoMarkCard(card) {
        this.calledNumbers.forEach(number => {
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    if (card.numbers[row][col] === number) {
                        const cellKey = `${row}-${col}`;
                        if (!card.marked.includes(cellKey)) {
                            card.marked.push(cellKey);
                        }
                    }
                }
            }
        });
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
        const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
        const currentPattern = gameState.currentPattern;
        
        if (!currentPattern || !currentPattern.positions) {
            return false;
        }
        
        // Verificar si todas las posiciones del patrón están marcadas
        for (const [row, col] of currentPattern.positions) {
            const cellKey = `${row}-${col}`;
            const isFree = card.numbers[row][col] === 0;
            
            if (!isFree && !card.marked.includes(cellKey)) {
                return false;
            }
        }
        
        return true;
    }

    checkLine(card) {
        // En ronda 1, verificar patrón en lugar de líneas
        if (this.currentRound === 1) {
            return this.checkPattern(card);
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
        const card = this.cards.find(c => c.id == cardId);
        if (!card) {
            console.log('Card not found for callBingo:', cardId, 'Available cards:', this.cards.map(c => c.id));
            return;
        }

        const hasBingo = this.checkBingo(card);
        const hasLine = this.checkLine(card);

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

        // Pausar juego inmediatamente
        this.pauseGame();
        
        // Mostrar alerta global
        this.showBingoAlert(bingoData);
        
        // Guardar para verificación del admin
        localStorage.setItem('pendingBingoVerification', JSON.stringify(bingoData));
        localStorage.setItem('globalBingoAlert', JSON.stringify(bingoData));
        
        // Deshabilitar todos los botones de BINGO
        this.disableAllBingoButtons();
    }

    pauseGame() {
        const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
        gameState.isPaused = true;
        gameState.pauseReason = 'bingo_verification';
        gameState.pauseTimestamp = Date.now();
        localStorage.setItem('bingoGameState', JSON.stringify(gameState));
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
        
        // Escuchar cambios en el estado del juego
        onValue(ref(database, 'gameState'), (snapshot) => {
            const firebaseState = snapshot.val();
            if (firebaseState) {
                console.log('Estado recibido de Firebase:', firebaseState);
                this.handleFirebaseGameState(firebaseState);
            }
        });
        
        // Escuchar números cantados
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            const firebaseNumbers = snapshot.val();
            if (firebaseNumbers && Array.isArray(firebaseNumbers)) {
                console.log('Números recibidos de Firebase:', firebaseNumbers.length);
                this.handleFirebaseNumbers(firebaseNumbers);
            }
        });
        
        console.log('✅ Firebase listeners iniciados');
    }
    
    handleFirebaseGameState(firebaseState) {
        // Actualizar estado local desde Firebase
        const hasStateChanged = (
            firebaseState.gameActive !== this.gameActive ||
            firebaseState.currentRound !== this.currentRound ||
            firebaseState.isPaused !== this.gameWasPaused
        );
        
        if (hasStateChanged) {
            console.log('Estado del juego cambió:', {
                gameActive: firebaseState.gameActive,
                currentRound: firebaseState.currentRound,
                isPaused: firebaseState.isPaused
            });
            
            this.gameActive = firebaseState.gameActive;
            this.currentRound = firebaseState.currentRound || 1;
            this.updateGameInfo();
            
            // Manejar cambios de estado
            if (firebaseState.gameActive && !firebaseState.isPaused) {
                this.handleGameStarted();
            } else if (firebaseState.isPaused) {
                this.handleGamePaused(firebaseState.pauseReason);
            } else if (!firebaseState.gameActive) {
                this.handleGameEnded();
            }
        }
        
        // Actualizar también localStorage para compatibilidad
        localStorage.setItem('bingoGameState', JSON.stringify(firebaseState));
    }
    
    handleFirebaseNumbers(firebaseNumbers) {
        const newNumbers = firebaseNumbers
            .map(item => typeof item === 'object' ? item.number : item)
            .filter(num => !this.calledNumbers.includes(num));
        
        if (newNumbers.length > 0) {
            console.log('Procesando nuevos números:', newNumbers);
            newNumbers.forEach((num, index) => {
                const isLatest = index === newNumbers.length - 1;
                this.processNewNumber(num, isLatest);
            });
        }
    }
    
    handleGameStarted() {
        const needsMarking = this.cards.some(card => card.status === 'vigente');
        if (needsMarking) {
            this.markCardsInUse();
            this.showToast('✅ ¡El juego ha comenzado!');
        }
        
        this.hideBingoAlert();
        this.hideWinnerAlert();
        this.hidePauseAlert();
        
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
        this.markCardsExpired();
        this.showToast('🏁 Juego terminado. Compra nuevos cartones.');
        this.resetGameAlerts();
        this.hidePatternButton();
    }

    checkGameState() {
        // Función mantenida como backup para cuando Firebase no esté disponible
        if (window.firebase) {
            // Firebase está manejando el estado, solo verificar localStorage como backup
            return;
        }
        
        const gameState = localStorage.getItem('bingoGameState');
        if (!gameState) return;

        const state = JSON.parse(gameState);
        
        // Verificar cambios en el estado del juego
        if (state.gameActive !== this.gameActive) {
            this.gameActive = state.gameActive;
            this.currentRound = state.currentRound || 1;
            this.updateGameInfo();
            
            if (this.gameActive) {
                this.handleGameStarted();
            } else {
                const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
                if (!gameState.gameActive && !gameState.isPaused) {
                    this.handleGameEnded();
                }
            }
        }

        // Verificar si el juego se reanudó después de verificación
        if (state.gameActive && !state.isPaused && this.gameWasPaused) {
            this.gameWasPaused = false;
            this.hideBingoAlert();
            this.enableAllBingoButtons();
            
            const verificationResult = localStorage.getItem('bingoVerificationResult');
            if (verificationResult) {
                const result = JSON.parse(verificationResult);
                this.handleVerificationResult(result);
                localStorage.removeItem('bingoVerificationResult');
            }
        }

        // Verificar pausa por administrador
        if (state.isPaused && state.pauseReason === 'admin_pause') {
            this.handleGamePaused('admin_pause');
        } else if (!state.isPaused || !state.pauseReason) {
            this.hidePauseAlert();
        }

        if (state.isPaused) {
            this.gameWasPaused = true;
        }

        // Procesar nuevos números solo si no está pausado
        if (state.calledNumbers && !state.isPaused) {
            const newNumbers = state.calledNumbers
                .map(item => typeof item === 'object' ? item.number : item)
                .filter(num => !this.calledNumbers.includes(num));

            newNumbers.forEach((num, index) => {
                const isLatest = index === newNumbers.length - 1;
                this.processNewNumber(num, isLatest);
            });
        }
    }

    checkBingoAlerts() {
        const alert = localStorage.getItem('globalBingoAlert');
        if (alert && !this.currentAlertShown) {
            const alertData = JSON.parse(alert);
            this.showBingoAlert(alertData);
            this.currentAlertShown = true;
        } else if (!alert && this.currentAlertShown) {
            this.hideBingoAlert();
            this.currentAlertShown = false;
        }
    }

    handleVerificationResult(result) {
        if (result.isCorrect) {
            if (result.isWinner) {
                // El jugador actual ganó
                this.showWinnerAlert(result);
            } else {
                // Otro jugador ganó
                this.showToast(`🏆 ${result.winnerCard} ganó con ${result.type}`);
            }
            
            if (result.gameEnded) {
                this.showToast('🏁 Partida finalizada');
            } else {
                this.showToast('➡️ Avanzando a la siguiente ronda');
            }
        } else {
            this.showToast('❌ BINGO incorrecto. El juego continúa.');
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
        const verifiedPurchases = JSON.parse(localStorage.getItem('verifiedPurchases') || '[]');
        const totalSales = verifiedPurchases.reduce((sum, p) => sum + p.cartones, 0) * 60;
        const roundPrize = this.currentRound === 1 ? totalSales * 0.25 : totalSales * 0.50;

        document.getElementById('current-round').textContent = this.currentRound;
        document.getElementById('current-prize').textContent = Math.round(roundPrize);
    }

    updateLastNumber(number) {
        const letter = this.getBingoLetter(number);
        
        // Mostrar mini bola en header
        this.showMiniBall(letter, number);
        
        // Actualizar últimos 3 números
        this.updateRecentNumbers(letter, number);
    }

    showMiniBall(letter, number) {
        const miniBall = document.getElementById('mini-ball');
        const ballLetter = document.getElementById('mini-ball-letter');
        const ballNumber = document.getElementById('mini-ball-number');
        
        if (!miniBall || !ballLetter || !ballNumber) return;
        
        // Ocultar bola anterior si existe
        miniBall.classList.remove('show');
        
        setTimeout(() => {
            ballLetter.textContent = letter;
            ballNumber.textContent = number;
            
            miniBall.style.display = 'flex';
            miniBall.style.animation = 'ballPop 0.6s ease-out';
            miniBall.classList.add('show');
            
            // Ocultar después de 3 segundos
            setTimeout(() => {
                miniBall.classList.remove('show');
                setTimeout(() => {
                    miniBall.style.display = 'none';
                }, 400);
            }, 3000);
        }, 100);
    }

    updateRecentNumbers(letter, number) {
        const recentNumbers = document.querySelectorAll('.recent-number');
        
        // Obtener los últimos 3 números ANTES del actual
        const previousNumbers = this.calledNumbers.slice(-4, -1); // Los 3 anteriores al último
        
        // Limpiar todos los números
        recentNumbers.forEach(num => {
            num.textContent = '--';
            num.classList.remove('latest');
        });
        
        // Mostrar los 3 números anteriores (no incluir el actual)
        previousNumbers.forEach((num, index) => {
            if (recentNumbers[index]) {
                const numLetter = this.getBingoLetter(num);
                recentNumbers[index].textContent = `${numLetter}${num}`;
            }
        });
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

    showPauseAlert() {
        const alert = document.getElementById('pause-alert');
        if (alert) alert.style.display = 'flex';
    }

    hidePauseAlert() {
        const alert = document.getElementById('pause-alert');
        if (alert) alert.style.display = 'none';
    }

    resetGameAlerts() {
        this.hideBingoAlert();
        this.hideWinnerAlert();
        this.hidePauseAlert();
        localStorage.removeItem('globalBingoAlert');
        localStorage.removeItem('pendingBingoVerification');
        localStorage.removeItem('bingoVerificationResult');
    }

    // === HISTORY MODAL ===
    generateNumbersGrid() {
        const grid = document.getElementById('numbers-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        const sections = [
            { start: 1, end: 15 },   // B
            { start: 16, end: 30 },  // I
            { start: 31, end: 45 },  // N
            { start: 46, end: 60 },  // G
            { start: 61, end: 75 }   // O
        ];

        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'number-section';
            
            for (let i = section.start; i <= section.end; i++) {
                const cell = document.createElement('div');
                cell.className = 'number-cell';
                cell.textContent = i;
                cell.id = `num-${i}`;
                sectionDiv.appendChild(cell);
            }
            
            grid.appendChild(sectionDiv);
        });
    }

    markNumberCalled(number) {
        const cell = document.getElementById(`num-${number}`);
        if (cell) cell.classList.add('called');
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
        const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
        
        if (gameState.currentPattern && gameState.currentRound === 1) {
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
        const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
        const pattern = gameState.currentPattern;
        
        if (!pattern) {
            this.showToast('No hay patrón disponible');
            return;
        }
        
        this.renderPatternGrid(pattern);
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

    // === CARD UTILITIES ===
    autoMarkAllCards(number) {
        let hasChanges = false;
        
        this.cards.forEach(card => {
            if (card.autoMode) {
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (card.numbers[row][col] === number) {
                            const cellKey = `${row}-${col}`;
                            if (!card.marked.includes(cellKey)) {
                                card.marked.push(cellKey);
                                hasChanges = true;
                            }
                        }
                    }
                }
            }
        });

        if (hasChanges) {
            this.saveCards();
            this.renderCards();
        }
    }

    markCardsInUse() {
        const allCards = JSON.parse(localStorage.getItem('playerCards') || '[]');
        let hasChanges = false;
        
        allCards.forEach(card => {
            if (card.status === 'vigente') {
                card.status = 'en_uso';
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            localStorage.setItem('playerCards', JSON.stringify(allCards));
            console.log('Cartones marcados como en uso');
            this.loadCards(); // Recargar cartones
        }
    }

    markCardsExpired() {
        const allCards = JSON.parse(localStorage.getItem('playerCards') || '[]');
        let hasChanges = false;
        
        allCards.forEach(card => {
            if (card.status === 'en_uso' || card.status === 'vigente') {
                card.status = 'vencido';
                card.expiredDate = new Date().toISOString();
                card.expiredReason = 'Juego completado (2 rondas)';
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            localStorage.setItem('playerCards', JSON.stringify(allCards));
            console.log('Cartones marcados como vencidos');
        }
        
        this.loadCards();
    }

    saveCards() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (window.firebase && userPhone) {
            this.saveCardsToFirebase(userPhone);
        }
        
        // Mantener localStorage como backup
        const allCards = JSON.parse(localStorage.getItem('playerCards') || '[]');
        this.cards.forEach(activeCard => {
            const index = allCards.findIndex(c => c.id === activeCard.id);
            if (index !== -1) {
                allCards[index] = activeCard;
            }
        });
        localStorage.setItem('playerCards', JSON.stringify(allCards));
    }
    
    saveCardsToFirebase(phone) {
        const { database, ref, set } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        // Obtener todos los cartones del jugador y actualizar solo los activos
        const { database: db, ref: dbRef, get } = window.firebase;
        get(dbRef(db, `playerCards/${cleanPhone}`)).then((snapshot) => {
            let allCards = snapshot.val() || [];
            
            this.cards.forEach(activeCard => {
                const index = allCards.findIndex(c => c.id === activeCard.id);
                if (index !== -1) {
                    allCards[index] = activeCard;
                }
            });
            
            set(dbRef(db, `playerCards/${cleanPhone}`), allCards)
                .then(() => console.log('✅ Cartones guardados en Firebase'))
                .catch(error => console.error('❌ Error guardando cartones:', error));
        });
    }
}

// Inicializar
let gameRoom;
document.addEventListener('DOMContentLoaded', () => {
    gameRoom = new GameRoom();
});