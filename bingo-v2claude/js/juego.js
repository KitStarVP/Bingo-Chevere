// Sala de Juego Móvil - COMPLETA
class MobileGameRoom {
    constructor() {
        this.cards = [];
        this.calledNumbers = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.currentPattern = null;
        this.numberQueue = [];
        this.isProcessingQueue = false;
        this.lastProcessedTime = 0;
        this.MIN_INTERVAL = 3000;
        this.seenWinMessages = new Set(JSON.parse(localStorage.getItem('seenWinMessages') || '[]'));
        this.init();
    }

    init() {
        this.waitForFirebase(0);
    }
    
    waitForFirebase(attempts) {
        if (window.firebase) {
            this.generateNumbersGrid();
            this.loadCards();
            this.startGameMonitoring();
            this.loadInitialGameState();
        } else if (attempts < 10) {
            setTimeout(() => this.waitForFirebase(attempts + 1), 1000);
        }
    }

    loadCards() {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone || !window.firebase) return;
        
        const { database, ref, onValue } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        onValue(ref(database, `playerCards/${cleanPhone}`), (snapshot) => {
            const firebaseCards = snapshot.val();
            if (firebaseCards && Array.isArray(firebaseCards)) {
                this.cards = firebaseCards.filter(card => 
                    card && (card.status === 'vigente' || card.status === 'en_uso')
                );
                
                if (this.cards.length > 0) {
                    this.processLoadedCards();
                }
            }
        });
    }
    
    processLoadedCards() {
        this.cards.forEach(card => {
            if (!card.marked) card.marked = ['2-2'];
            if (card.autoMode === undefined) card.autoMode = true;
            if (!card.id) card.id = Date.now() + Math.random();
        });

        this.renderCards();
        
        if (this.calledNumbers.length > 0) {
            this.cards.forEach(card => {
                if (card.autoMode) {
                    const hadNewMarks = this.autoMarkCard(card);
                    if (hadNewMarks) this.saveCardToFirebase(card);
                }
            });
            this.renderCards();
        }
    }

    renderCards() {
        const container = document.getElementById('cards-container');
        if (!container) return;
        
        container.innerHTML = '';

        this.cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        cardDiv.dataset.cardId = card.id;
        
        const cardCode = card.code || `C${card.id}`;
        const marcadosCount = card.marked ? card.marked.length : 0;
        const progreso = Math.round(marcadosCount / 25 * 100);
        
        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.innerHTML = `
            <span class="card-code">${cardCode}</span>
            <span class="card-progress">${marcadosCount}/25 (${progreso}%)</span>
        `;
        
        const bingoLetters = document.createElement('div');
        bingoLetters.className = 'bingo-letters';
        ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
            const span = document.createElement('span');
            span.textContent = letter;
            bingoLetters.appendChild(span);
        });
        
        const cardGrid = document.createElement('div');
        cardGrid.className = 'card-grid';
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'card-cell';
                
                const number = card.numbers[row][col];
                const isFree = number === 0;
                const cellKey = `${row}-${col}`;
                const isMarked = card.marked.includes(cellKey) || isFree;
                const wasCalled = this.calledNumbers.includes(number) && !isFree;
                
                let isPatternCell = false;
                if (this.currentRound === 1 && this.currentPattern && this.currentPattern.positions) {
                    isPatternCell = this.currentPattern.positions.some(pos => pos[0] === row && pos[1] === col);
                }
                
                if (isMarked) cell.classList.add('marked');
                if (isFree) cell.classList.add('free');
                if (wasCalled) cell.classList.add('called');
                if (isPatternCell) cell.classList.add('pattern');
                
                cell.dataset.cardId = card.id;
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.dataset.number = number;
                cell.textContent = isFree ? 'FREE' : number;
                
                cell.addEventListener('click', () => {
                    this.toggleCell(card.id, row, col);
                });
                
                cardGrid.appendChild(cell);
            }
        }
        
        const cardControls = document.createElement('div');
        cardControls.className = 'card-controls';
        
        const modeSelector = document.createElement('div');
        modeSelector.className = 'mode-selector';
        
        const autoBtn = document.createElement('button');
        autoBtn.className = `mode-option ${card.autoMode ? 'active' : ''}`;
        autoBtn.textContent = '🤖 Auto';
        autoBtn.addEventListener('click', () => this.setMode(card.id, true));
        
        const manualBtn = document.createElement('button');
        manualBtn.className = `mode-option ${!card.autoMode ? 'active' : ''}`;
        manualBtn.textContent = '✋ Manual';
        manualBtn.addEventListener('click', () => this.setMode(card.id, false));
        
        const bingoBtn = document.createElement('button');
        const hasPattern = this.currentRound === 1 && this.checkPattern(card);
        const hasFullBingo = this.currentRound === 2 && this.checkBingo(card);
        const canCallBingo = hasPattern || hasFullBingo;
        
        bingoBtn.className = `bingo-btn ${canCallBingo ? 'has-bingo' : ''}`;
        bingoBtn.textContent = this.currentRound === 1 ? (hasPattern ? '🎯 PATRÓN!' : 'PATRÓN') : (hasFullBingo ? '🏆 BINGO!' : 'BINGO');
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
        
        this.saveCardToFirebase(card);
        this.renderCards();
    }

    setMode(cardId, isAuto) {
        const card = this.cards.find(c => c.id == cardId);
        if (!card || card.autoMode === isAuto) return;

        card.autoMode = isAuto;
        
        if (card.autoMode) {
            this.showToast('Modo automático activado');
            const hadNewMarks = this.autoMarkCard(card);
            if (hadNewMarks) this.saveCardToFirebase(card);
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
                        }
                    }
                }
            }
        });
        
        const freeKey = '2-2';
        if (!card.marked.includes(freeKey)) {
            card.marked.push(freeKey);
        }
        
        return hasNewMarks;
    }

    checkBingo(card) {
        if (!card.marked) return false;
        
        if (this.currentRound === 1) {
            return this.checkPattern(card);
        } else {
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
        if (!card.marked || !this.currentPattern || !this.currentPattern.positions) return false;
        
        for (const [row, col] of this.currentPattern.positions) {
            const cellKey = `${row}-${col}`;
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
            set(ref(database, 'pendingBingoVerification'), bingoData);
        }
    }

    showBingoAlert() {
        const alert = document.getElementById('bingo-alert');
        if (alert) alert.style.display = 'flex';
    }

    hideBingoAlert() {
        const alert = document.getElementById('bingo-alert');
        if (alert) alert.style.display = 'none';
    }

    loadInitialGameState() {
        if (!window.firebase) return;
        
        const { database, ref, get } = window.firebase;
        
        get(ref(database, 'gameState')).then((snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.gameActive = gameState.gameActive || false;
                this.currentRound = gameState.currentRound || 1;
                this.currentPattern = gameState.currentPattern;
            }
            this.updateGameInfo();
        });
        
        get(ref(database, 'calledNumbers')).then((snapshot) => {
            const numbers = snapshot.val();
            if (numbers && Array.isArray(numbers)) {
                // Extraer solo los números
                this.calledNumbers = numbers.map(n => typeof n === 'object' ? n.number : n);
                this.processExistingNumbers();
            }
        });
        
        // Iniciar caller si es jugador
        this.startCallerIfNeeded();
    }
    
    startCallerIfNeeded() {
        // Los jugadores también pueden ser callers
        if (typeof UltraCaller !== 'undefined' && window.firebase) {
            if (!window.ultraCaller) {
                window.ultraCaller = new UltraCaller(window.firebase.database);
            }
            // Iniciar como jugador (no admin) después de cargar todo
            setTimeout(() => {
                if (window.ultraCaller && !window.ultraCaller.isActive) {
                    const { database, ref, get } = window.firebase;
                    get(ref(database, 'gameState')).then((snapshot) => {
                        const gameState = snapshot.val();
                        if (gameState && gameState.gameActive && !gameState.gameFinalized) {
                            console.log('🎮 Jugador iniciando caller automático...');
                            window.ultraCaller.start(false);
                        }
                    });
                }
            }, 3000);
        }
    }

    processExistingNumbers() {
        this.generateNumbersGrid();
        
        if (this.calledNumbers.length > 0) {
            const lastNumber = this.calledNumbers[this.calledNumbers.length - 1];
            this.updateCurrentNumber(lastNumber);
        }
        
        if (this.calledNumbers.length > 0) {
            console.log(`🔄 Procesando ${this.calledNumbers.length} números existentes...`);
            this.cards.forEach(card => {
                if (card.autoMode) {
                    const hadNewMarks = this.autoMarkCard(card);
                    if (hadNewMarks) this.saveCardToFirebase(card);
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
        
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            let firebaseNumbers = snapshot.val();
            if (firebaseNumbers && Array.isArray(firebaseNumbers)) {
                // Extraer solo los números
                const numbers = firebaseNumbers.map(n => typeof n === 'object' ? n.number : n);
                const newNumbers = numbers.filter(num => !this.calledNumbers.includes(num));
                
                if (newNumbers.length > 0) {
                    // Procesar con timestamps
                    const now = Date.now();
                    const recentNumbers = [];
                    const oldNumbers = [];
                    
                    firebaseNumbers.forEach(item => {
                        const num = typeof item === 'object' ? item.number : item;
                        const timestamp = typeof item === 'object' ? item.timestamp : now;
                        
                        if (newNumbers.includes(num)) {
                            const age = now - timestamp;
                            if (age < 5000) {
                                recentNumbers.push(num);
                            } else {
                                oldNumbers.push(num);
                            }
                        }
                    });
                    
                    // Procesar números viejos inmediatamente (catch-up)
                    if (oldNumbers.length > 0) {
                        console.log(`🔄 Recuperando ${oldNumbers.length} números perdidos...`);
                        oldNumbers.forEach(num => {
                            this.calledNumbers.push(num);
                            this.markNumberCalled(num);
                            this.cards.forEach(card => {
                                if (card.autoMode) {
                                    const hadNewMarks = this.autoMarkCard(card);
                                    if (hadNewMarks) this.saveCardToFirebase(card);
                                }
                            });
                        });
                        this.renderCards();
                        if (oldNumbers.length > 0) {
                            this.updateCurrentNumber(oldNumbers[oldNumbers.length - 1]);
                        }
                    }
                    
                    // Procesar números recientes con cola
                    if (recentNumbers.length > 0) {
                        this.addNumbersToQueue(recentNumbers);
                    }
                }
                
                this.calledNumbers = numbers;
                this.generateNumbersGrid();
            }
        });
        
        onValue(ref(database, 'gameState'), (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.gameActive = gameState.gameActive || false;
                this.currentRound = gameState.currentRound || 1;
                this.currentPattern = gameState.currentPattern;
                this.updateGameInfo();
            }
        });
        
        onValue(ref(database, 'bingoVerificationResult'), (snapshot) => {
            const result = snapshot.val();
            if (result) {
                this.handleBingoVerification(result);
            }
        });
        
        onValue(ref(database, 'roundTwoReset'), (snapshot) => {
            const resetData = snapshot.val();
            if (resetData && resetData.reset) {
                this.handleRoundTwoReset();
            }
        });
    }

    updateCurrentNumber(number) {
        const currentNumberEl = document.getElementById('current-ball');
        if (currentNumberEl) {
            const letter = this.getBingoLetter(number);
            currentNumberEl.textContent = `${letter}${number}`;
        }
    }

    addNumbersToQueue(numbers) {
        numbers.forEach(num => {
            if (!this.numberQueue.includes(num)) {
                this.numberQueue.push(num);
            }
        });
        
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }
    
    async processQueue() {
        if (this.isProcessingQueue || this.numberQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.numberQueue.length > 0) {
            const currentTime = Date.now();
            const timeSinceLastProcess = currentTime - this.lastProcessedTime;
            
            if (this.lastProcessedTime > 0 && timeSinceLastProcess < this.MIN_INTERVAL) {
                const waitTime = this.MIN_INTERVAL - timeSinceLastProcess;
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            const number = this.numberQueue.shift();
            this.processNewNumber(number);
            this.lastProcessedTime = Date.now();
        }
        
        this.isProcessingQueue = false;
    }

    processNewNumber(number) {
        this.markNumberCalled(number);
        
        this.cards.forEach(card => {
            if (card.autoMode) {
                const hadNewMarks = this.autoMarkCard(card);
                if (hadNewMarks) this.saveCardToFirebase(card);
            }
        });
        
        this.renderCards();
        this.updateCurrentNumber(number);
        this.callNumberWithVoice(number);
    }

    updateGameInfo() {
        const roundElement = document.getElementById('round');
        const prizeElement = document.getElementById('prize');
        
        if (roundElement) roundElement.textContent = this.currentRound;
        
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
    
    callNumberWithVoice(number) {
        if (!('speechSynthesis' in window)) return;
        
        const letter = this.getBingoLetter(number);
        const numberCall = `${letter} ${number}`;
        
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(numberCall);
        utterance.lang = 'es-ES';
        utterance.rate = 0.8;
        utterance.volume = 1;
        utterance.pitch = 1;
        
        const voices = speechSynthesis.getVoices();
        const spanishVoice = voices.find(voice => voice.lang.includes('es'));
        if (spanishVoice) {
            utterance.voice = spanishVoice;
        }
        
        speechSynthesis.speak(utterance);
    }

    generateNumbersGrid() {
        const grid = document.getElementById('numbers-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        for (let i = 1; i <= 75; i++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = i;
            cell.id = `num-${i}`;
            
            if (this.calledNumbers.includes(i)) {
                cell.classList.add('called');
            }
            
            grid.appendChild(cell);
        }
    }

    markNumberCalled(number) {
        const cell = document.getElementById(`num-${number}`);
        if (cell && !cell.classList.contains('called')) {
            cell.classList.add('called');
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
            window.modal.info('El patrón solo aplica en Ronda 1', 'Información');
            return;
        }
        
        if (!this.currentPattern || !this.currentPattern.positions) {
            window.modal.warning('No hay patrón definido para esta ronda', 'Patrón No Disponible');
            return;
        }
        
        const modal = document.getElementById('pattern-modal');
        const display = document.getElementById('pattern-display');
        const title = modal?.querySelector('.modal-header h3');
        
        if (title && this.currentPattern.name) {
            title.textContent = `Patrón: ${this.currentPattern.name}`;
        }
        
        if (display) {
            display.innerHTML = '';
            
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 5; col++) {
                    const cell = document.createElement('div');
                    cell.className = 'pattern-cell';
                    
                    const isActive = this.currentPattern.positions.some(pos => pos[0] === row && pos[1] === col);
                    
                    if (row === 2 && col === 2) {
                        cell.classList.add('free');
                        cell.textContent = 'FREE';
                    } else if (isActive) {
                        cell.classList.add('active');
                        cell.textContent = '✓';
                    } else {
                        cell.textContent = '';
                    }
                    
                    display.appendChild(cell);
                }
            }
        }
        
        if (modal) modal.classList.add('show');
    }

    closePattern() {
        const modal = document.getElementById('pattern-modal');
        if (modal) modal.classList.remove('show');
    }

    saveCardToFirebase(card) {
        if (!window.firebase) return;
        
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;
        
        const { database, ref, get, set } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        get(ref(database, `playerCards/${cleanPhone}`))
            .then((snapshot) => {
                const firebaseCards = snapshot.val();
                if (firebaseCards && Array.isArray(firebaseCards)) {
                    const cardIndex = firebaseCards.findIndex(c => c.code === card.code);
                    if (cardIndex !== -1) {
                        firebaseCards[cardIndex].marked = card.marked;
                        firebaseCards[cardIndex].autoMode = card.autoMode;
                        return set(ref(database, `playerCards/${cleanPhone}`), firebaseCards);
                    }
                }
            })
            .catch(error => {
                console.error('Error guardando cartón:', error);
            });
    }

    showToast(message) {
        let toast = document.getElementById('game-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'game-toast';
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 24px;border-radius:8px;z-index:9999;display:none;font-size:14px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    showPauseAlert() {
        let alert = document.getElementById('pause-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'pause-alert';
            alert.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:none;align-items:center;justify-content:center;z-index:9998;';
            alert.innerHTML = '<div style="background:white;padding:32px;border-radius:16px;text-align:center;max-width:300px;"><div style="font-size:48px;margin-bottom:16px;">⏸️</div><h3 style="margin:0 0 8px 0;color:#333;">Juego Pausado</h3><p style="color:#666;margin:0;">El admin ha pausado el juego temporalmente</p></div>';
            document.body.appendChild(alert);
        }
        alert.style.display = 'flex';
    }

    hidePauseAlert() {
        const alert = document.getElementById('pause-alert');
        if (alert) alert.style.display = 'none';
    }

    closeWinnerAlert() {
        const alert = document.getElementById('winner-alert');
        if (alert) alert.style.display = 'none';
    }
    
    handleBingoVerification(result) {
        this.hideBingoAlert();
        
        if (result.isWinner) {
            const alert = document.getElementById('winner-alert');
            const msg = document.getElementById('winner-msg');
            const prize = document.getElementById('winner-prize');
            
            if (alert && msg && prize) {
                msg.textContent = `¡Felicitaciones! Has ganado ${result.typeText}`;
                prize.textContent = `BsF ${result.prize || 0}`;
                alert.style.display = 'flex';
            }
        } else {
            this.showToast('BINGO incorrecto. El juego continúa.');
        }
    }
    
    handleRoundTwoReset() {
        console.log('🔄 Procesando reset de Ronda 2...');
        this.numberQueue = [];
        this.isProcessingQueue = false;
        this.lastProcessedTime = 0;
        this.calledNumbers = [];
        
        this.cards.forEach(card => {
            card.marked = ['2-2'];
            this.saveCardToFirebase(card);
        });
        
        this.generateNumbersGrid();
        
        const currentBall = document.getElementById('current-ball');
        if (currentBall) {
            currentBall.textContent = '--';
        }
        
        this.renderCards();
        this.showToast('🔄 Ronda 2 iniciada - Cartones reseteados');
        
        if (window.firebase) {
            const { database, ref, set } = window.firebase;
            set(ref(database, 'roundTwoReset'), null);
        }
    }
}

let gameRoom = null;

document.addEventListener('DOMContentLoaded', () => {
    const userPhone = localStorage.getItem('userPhone');
    if (!userPhone) {
        window.location.href = 'index.html';
        return;
    }
    
    gameRoom = new MobileGameRoom();
    
    // Event listeners para botones
    document.getElementById('history-btn')?.addEventListener('click', () => gameRoom?.showHistory());
    document.getElementById('close-history')?.addEventListener('click', () => gameRoom?.closeHistory());
    document.getElementById('pattern-btn')?.addEventListener('click', () => gameRoom?.showPattern());
    document.getElementById('close-pattern')?.addEventListener('click', () => gameRoom?.closePattern());
    document.getElementById('close-winner')?.addEventListener('click', () => gameRoom?.closeWinnerAlert());
    
    window.gameRoom = {
        showHistory: () => gameRoom?.showHistory(),
        closeHistory: () => gameRoom?.closeHistory(),
        showPattern: () => gameRoom?.showPattern(),
        closePattern: () => gameRoom?.closePattern(),
        closeWinnerAlert: () => gameRoom?.closeWinnerAlert()
    };
});
