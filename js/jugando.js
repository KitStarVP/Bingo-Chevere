// Jugando - Sala de Juego Optimizada
class GameRoom {
    constructor() {
        this.cards = [];
        this.calledNumbers = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.audioEnabled = true;
        this.audioActivated = false;
        this.currentPattern = null;
        
        console.log('🎮 Iniciando sala de juego optimizada...');
        this.init();
    }

    async init() {
        // Esperar a que Firebase esté disponible
        await this.waitForFirebase();
        
        // Configurar audio
        this.setupAudio();
        
        // Generar grid de números
        this.generateNumbersGrid();
        
        // Cargar datos
        await this.loadCards();
        await this.loadGameState();
        
        // Iniciar monitoreo
        this.startFirebaseListeners();
        
        console.log('✅ Sala de juego inicializada correctamente');
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            const checkFirebase = () => {
                if (window.firebase) {
                    console.log('🔥 Firebase disponible');
                    resolve();
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            checkFirebase();
        });
    }

    // === AUDIO SYSTEM ===
    setupAudio() {
        if ('speechSynthesis' in window) {
            this.speech = window.speechSynthesis;
            this.loadVoices();
            
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = () => this.loadVoices();
            }
            
            // Activar audio en interacción
            ['click', 'touchstart', 'keydown'].forEach(event => {
                document.addEventListener(event, () => this.activateAudio(), { once: true });
            });
            
            console.log('🔊 Sistema de audio configurado');
        }
    }

    loadVoices() {
        this.voices = this.speech.getVoices();
        this.spanishVoice = this.voices.find(v => 
            v.lang.startsWith('es') || v.name.toLowerCase().includes('spanish')
        ) || this.voices[0];
        
        console.log(`🎤 Voces: ${this.voices.length}, Español: ${this.spanishVoice?.name || 'No'}`);
    }

    activateAudio() {
        if (this.speech && !this.audioActivated) {
            try {
                const utterance = new SpeechSynthesisUtterance(' ');
                utterance.volume = 0.01;
                utterance.rate = 2;
                
                utterance.onend = () => {
                    this.audioActivated = true;
                    console.log('✅ Audio activado');
                };
                
                this.speech.speak(utterance);
                
                setTimeout(() => {
                    this.audioActivated = true;
                }, 500);
                
            } catch (error) {
                console.error('❌ Error activando audio:', error);
                this.audioActivated = true;
            }
        }
    }

    speakNumber(number) {
        if (!this.audioEnabled || !this.speech || this.cards.length === 0) return;

        try {
            this.speech.cancel();
            
            const letter = this.getBingoLetter(number);
            const text = `${letter} ${number} repito ${letter} ${number}`;
            
            const utterance = new SpeechSynthesisUtterance(text);
            if (this.spanishVoice) utterance.voice = this.spanishVoice;
            utterance.rate = 0.9;
            utterance.lang = 'es-ES';
            
            console.log('🔊 Cantando:', text);
            this.speech.speak(utterance);
            
        } catch (error) {
            console.error('❌ Error en voz:', error);
        }
    }

    // === CARD MANAGEMENT ===
    async loadCards() {
        const userPhone = localStorage.getItem('userPhone');
        
        if (!userPhone) {
            console.error('❌ No hay teléfono de usuario');
            this.showAccessBlocked();
            return;
        }
        
        const { database, ref, onValue } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        onValue(ref(database, `playerCards/${cleanPhone}`), (snapshot) => {
            const firebaseCards = snapshot.val();
            if (firebaseCards && Array.isArray(firebaseCards)) {
                this.cards = firebaseCards.filter(card => 
                    card.status === 'vigente' || card.status === 'en_uso'
                );
                
                this.processCards();
                console.log('✅ Cartones cargados:', this.cards.length);
            } else {
                this.cards = [];
                this.showAccessBlocked();
            }
        });
    }

    processCards() {
        this.cards.forEach(card => {
            if (!card.marked) card.marked = [];
            if (card.autoMode === undefined) card.autoMode = true;
            if (!card.id) card.id = Date.now() + Math.random();
        });

        if (this.cards.length === 0) {
            this.showAccessBlocked();
        } else if (!this.gameActive) {
            this.showWaitingForGame();
        } else {
            this.renderCards();
            // Auto-marcar números ya cantados
            setTimeout(() => {
                this.cards.forEach(card => {
                    if (card.autoMode) this.autoMarkCard(card);
                });
                this.renderCards();
            }, 500);
        }
    }

    showWaitingForGame() {
        const container = document.getElementById('cards-container');
        container.innerHTML = `
            <div class="waiting-content" style="text-align: center; padding: 4rem 2rem;">
                <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 20px; padding: 3rem 2rem; border: 1px solid rgba(255,255,255,0.2);">
                    <h2 style="color: white; font-size: 2rem; margin-bottom: 1rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">⏳ Esperando Juego</h2>
                    <p style="color: rgba(255,255,255,0.9); font-size: 1.1rem; margin-bottom: 2rem;">Tienes cartones listos. Esperando que inicie el próximo juego.</p>
                    <div style="background: rgba(52,152,219,0.2); padding: 1rem; border-radius: 10px; margin: 1rem 0;">
                        <p style="color: #3498db; font-weight: 600;">Cartones: ${this.cards.length}</p>
                    </div>
                </div>
            </div>
        `;
    }

    showAccessBlocked() {
        document.getElementById('access-blocked').style.display = 'block';
    }

    renderCards() {
        const container = document.getElementById('cards-container');
        const waitingState = document.getElementById('waiting-state');
        
        container.innerHTML = '';
        waitingState.style.display = 'none';
        document.getElementById('access-blocked').style.display = 'none';

        this.cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';
        
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
        
        cardDiv.innerHTML = `
            <div class="card-header">ID-${cardCode}</div>
            <div class="bingo-letters">
                <span>B</span><span>I</span><span>N</span><span>G</span><span>O</span>
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
                <button class="bingo-btn ${bingoClass}" data-card-id="${card.id}" ${!canCallBingo ? 'disabled' : ''}>
                    ${bingoText}
                </button>
            </div>
        `;

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
            const wasCalled = this.calledNumbers.includes(number);
            
            let cellClass = 'card-cell';
            if (isMarked) cellClass += ' marked';
            if (isFree) cellClass += ' free';
            if (wasCalled && !isFree) cellClass += ' called';
            
            return `<div class="${cellClass}" data-card-id="${card.id}" data-row="${row}" data-col="${col}" data-number="${number}">
                        ${isFree ? 'FREE' : number}
                    </div>`;
        }).join('');
    }

    addCardEventListeners(cardDiv, card) {
        // Botones de modo
        cardDiv.querySelectorAll('.mode-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardId = parseInt(e.target.dataset.cardId);
                const isAuto = e.target.dataset.mode === 'auto';
                this.setMode(cardId, isAuto);
            });
        });

        // Botón BINGO
        const bingoBtn = cardDiv.querySelector('.bingo-btn');
        if (bingoBtn) {
            bingoBtn.addEventListener('click', (e) => {
                const cardId = parseInt(e.target.dataset.cardId);
                this.callBingo(cardId);
            });
        }

        // Celdas
        cardDiv.querySelectorAll('.card-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                const cardId = parseInt(e.target.dataset.cardId);
                const row = parseInt(e.target.dataset.row);
                const col = parseInt(e.target.dataset.col);
                this.toggleCell(cardId, row, col);
            });
        });
    }

    setMode(cardId, isAuto) {
        const card = this.cards.find(c => c.id == cardId);
        if (!card || card.autoMode === isAuto) return;

        card.autoMode = isAuto;
        
        if (isAuto) {
            this.autoMarkCard(card);
            this.showToast('🤖 Modo automático activado');
        } else {
            this.showToast('✋ Modo manual activado');
        }

        this.saveCards();
        this.renderCards();
    }

    toggleCell(cardId, row, col) {
        const card = this.cards.find(c => c.id == cardId);
        if (!card) return;

        if (card.autoMode) {
            this.showToast('⚠️ Desactiva modo automático para marcar manualmente');
            return;
        }

        const number = card.numbers[row][col];
        if (number === 0) return;

        const cellKey = `${row}-${col}`;
        const isMarked = card.marked.includes(cellKey);
        
        if (isMarked) {
            card.marked = card.marked.filter(key => key !== cellKey);
            this.showToast(`❌ Desmarcado: ${this.getBingoLetter(number)}${number}`);
        } else {
            card.marked.push(cellKey);
            this.showToast(`✅ Marcado: ${this.getBingoLetter(number)}${number}`);
        }

        this.saveCards();
        this.renderCards();
    }

    autoMarkCard(card) {
        let markedCount = 0;
        
        this.calledNumbers.forEach(number => {
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
        if (!this.currentPattern?.positions) return false;
        
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
        if (this.currentRound === 1) {
            return this.checkPattern(card);
        }
        
        // Verificar filas
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

        // Verificar columnas
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

        // Verificar diagonales
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
        if (!card) return;

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

        this.sendBingoToFirebase(bingoData);
        this.showBingoAlert(bingoData);
        this.disableAllBingoButtons();
    }

    sendBingoToFirebase(bingoData) {
        const { database, ref, push } = window.firebase;
        
        push(ref(database, 'pendingBingos'), bingoData)
            .then(() => console.log('✅ BINGO enviado para verificación'))
            .catch(error => console.error('❌ Error enviando BINGO:', error));
    }

    disableAllBingoButtons() {
        document.querySelectorAll('.bingo-btn').forEach(btn => {
            btn.disabled = true;
            btn.textContent = 'VERIFICANDO...';
            btn.className = 'bingo-btn';
        });
    }

    // === FIREBASE LISTENERS ===
    startFirebaseListeners() {
        const { database, ref, onValue } = window.firebase;
        
        // Estado del juego
        onValue(ref(database, 'gameState'), (snapshot) => {
            const gameState = snapshot.val();
            this.handleGameState(gameState);
        });
        
        // Números cantados
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            let numbers = snapshot.val();
            if (numbers && typeof numbers === 'object' && !Array.isArray(numbers)) {
                numbers = Object.values(numbers);
            }
            
            if (numbers && Array.isArray(numbers)) {
                this.handleNewNumbers(numbers);
            } else if (!numbers) {
                this.resetNumbers();
            }
        });
        
        console.log('✅ Firebase listeners iniciados');
    }

    handleGameState(gameState) {
        if (!gameState) {
            this.gameActive = false;
            if (this.cards.length > 0) this.showWaitingForGame();
            return;
        }

        // Verificar finalización
        if (gameState.gameFinalized || gameState.bothRoundsCompleted) {
            this.markCardsExpired('Juego finalizado');
            return;
        }

        const wasActive = this.gameActive;
        this.gameActive = gameState.gameActive || false;
        this.currentRound = gameState.currentRound || 1;
        this.currentPattern = gameState.currentPattern;

        // Actualizar UI
        document.getElementById('current-round').textContent = this.currentRound;
        this.updatePrize(gameState);

        // Detectar inicio de juego
        if (!wasActive && this.gameActive) {
            this.handleGameStarted();
        } else if (wasActive && !this.gameActive) {
            this.handleGameEnded();
        }

        // Mostrar/ocultar botón de patrón
        const patternBtn = document.querySelector('.pattern-btn');
        if (patternBtn) {
            patternBtn.style.display = (this.currentRound === 1 && this.currentPattern) ? 'block' : 'none';
        }
    }

    handleGameStarted() {
        console.log('▶️ Juego iniciado');
        this.markCardsInUse();
        this.renderCards();
        this.showToast('✅ ¡El juego ha comenzado!');
    }

    handleGameEnded() {
        console.log('⏹️ Juego terminado');
        if (this.cards.length > 0) {
            this.showWaitingForGame();
        }
        this.showToast('⏸️ Juego terminado. Esperando próximo juego.');
    }

    handleNewNumbers(firebaseNumbers) {
        const normalizedNumbers = firebaseNumbers
            .map(item => typeof item === 'object' ? item.number : item)
            .filter(num => typeof num === 'number' && num >= 1 && num <= 75);

        const newNumbers = normalizedNumbers.filter(num => !this.calledNumbers.includes(num));

        if (newNumbers.length > 0) {
            console.log('📢 Nuevos números:', newNumbers);

            newNumbers.forEach((num, index) => {
                setTimeout(() => {
                    this.processNewNumber(num);
                }, index * 1500);
            });

            this.calledNumbers = [...normalizedNumbers];
        }
    }

    processNewNumber(number) {
        console.log('🎯 Procesando número:', number);
        
        // Actualizar visualizaciones
        this.updateLastNumber(number);
        this.markNumberCalled(number);
        this.autoMarkAllCards(number);
        this.speakNumber(number);
        
        // Guardar cambios
        this.saveCards();
        this.renderCards();
    }

    resetNumbers() {
        console.log('🔄 Reiniciando números');
        this.calledNumbers = [];
        
        // Limpiar visualizaciones
        document.querySelectorAll('.recent-number').forEach(num => {
            num.textContent = '--';
            num.classList.remove('latest');
        });
        
        document.querySelectorAll('.number-cell.called').forEach(cell => {
            cell.classList.remove('called');
            cell.style.background = '';
            cell.style.color = '';
        });
        
        const miniBall = document.getElementById('mini-ball');
        if (miniBall) {
            miniBall.style.display = 'none';
            miniBall.classList.remove('show');
        }
        
        this.renderCards();
    }

    // === UI UPDATES ===
    updateLastNumber(number) {
        const letter = this.getBingoLetter(number);
        
        setTimeout(() => this.showMiniBall(letter, number), 200);
        setTimeout(() => this.updateRecentNumbers(letter, number), 400);
        
        document.title = `🎯 ${letter}${number} - Bingo Chévere`;
        setTimeout(() => {
            document.title = 'Jugando - Bingo Chévere';
        }, 5000);
    }

    showMiniBall(letter, number) {
        const miniBall = document.getElementById('mini-ball');
        const ballLetter = document.getElementById('mini-ball-letter');
        const ballNumber = document.getElementById('mini-ball-number');
        
        if (!miniBall || !ballLetter || !ballNumber) return;
        
        console.log('🎱 Mostrando mini-bola:', letter + number);
        
        miniBall.classList.remove('show');
        miniBall.style.display = 'none';
        
        setTimeout(() => {
            ballLetter.textContent = letter;
            ballNumber.textContent = number;
            
            miniBall.style.display = 'flex';
            miniBall.style.opacity = '0';
            miniBall.style.transform = 'scale(0.3)';
            
            miniBall.offsetHeight; // Forzar reflow
            
            miniBall.style.animation = 'ballPop 0.6s ease-out';
            miniBall.classList.add('show');
            
            setTimeout(() => {
                miniBall.classList.remove('show');
                setTimeout(() => miniBall.style.display = 'none', 500);
            }, 4000);
        }, 150);
    }

    updateRecentNumbers(letter, number) {
        const recentNumbers = document.querySelectorAll('.recent-number');
        if (!recentNumbers.length) return;
        
        const lastThree = this.calledNumbers.slice(-3);
        
        console.log('🔄 Actualizando números recientes:', lastThree);
        
        recentNumbers.forEach(num => {
            num.textContent = '--';
            num.classList.remove('latest');
        });
        
        lastThree.forEach((num, index) => {
            if (recentNumbers[index]) {
                const numLetter = this.getBingoLetter(num);
                recentNumbers[index].textContent = `${numLetter}${num}`;
                recentNumbers[index].style.opacity = '1';
                
                if (index === lastThree.length - 1) {
                    recentNumbers[index].classList.add('latest');
                }
            }
        });
    }

    updatePrize(gameState) {
        if (gameState?.prizes) {
            const prize = this.currentRound === 1 ? 
                gameState.prizes.round1 || 0 : 
                gameState.prizes.round2 || 0;
            document.getElementById('current-prize').textContent = Math.round(prize);
        }
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    // === HISTORY & PATTERN ===
    generateNumbersGrid() {
        const grid = document.getElementById('numbers-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        const sections = [
            { start: 1, end: 15, letter: 'B' },
            { start: 16, end: 30, letter: 'I' },
            { start: 31, end: 45, letter: 'N' },
            { start: 46, end: 60, letter: 'G' },
            { start: 61, end: 75, letter: 'O' }
        ];

        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'number-section';
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'section-header';
            headerDiv.textContent = section.letter;
            sectionDiv.appendChild(headerDiv);
            
            for (let i = section.start; i <= section.end; i++) {
                const cell = document.createElement('div');
                cell.className = 'number-cell';
                cell.textContent = i;
                cell.id = `num-${i}`;
                
                if (this.calledNumbers.includes(i)) {
                    cell.classList.add('called');
                }
                
                sectionDiv.appendChild(cell);
            }
            
            grid.appendChild(sectionDiv);
        });
    }

    markNumberCalled(number) {
        const cell = document.getElementById(`num-${number}`);
        if (cell && !cell.classList.contains('called')) {
            cell.classList.add('called');
            console.log('✅ Número marcado en historial:', number);
        }
    }

    showHistory() {
        this.generateNumbersGrid();
        document.getElementById('history-modal').classList.add('show');
    }

    closeHistory() {
        document.getElementById('history-modal').classList.remove('show');
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
            
            const isFree = row === 2 && col === 2;
            const isInPattern = pattern.positions.some(([r, c]) => r === row && c === col);
            
            if (isFree) {
                cell.classList.add('free');
                cell.textContent = 'FREE';
            } else if (isInPattern) {
                cell.classList.add('active');
                cell.textContent = '✓';
            }
            
            grid.appendChild(cell);
        }
    }

    // === UTILITIES ===
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
            console.log(`Auto-marcado ${this.getBingoLetter(number)}${number}`);
        }
    }

    async loadGameState() {
        const { database, ref, get } = window.firebase;
        
        try {
            const snapshot = await get(ref(database, 'gameState'));
            const gameState = snapshot.val();
            
            if (gameState) {
                this.gameActive = gameState.gameActive || false;
                this.currentRound = gameState.currentRound || 1;
                this.currentPattern = gameState.currentPattern;
                
                document.getElementById('current-round').textContent = this.currentRound;
                this.updatePrize(gameState);
                
                console.log('✅ Estado del juego cargado');
            }
            
            // Cargar números cantados
            const numbersSnapshot = await get(ref(database, 'calledNumbers'));
            let numbers = numbersSnapshot.val();
            
            if (numbers) {
                if (!Array.isArray(numbers)) numbers = Object.values(numbers);
                
                this.calledNumbers = numbers
                    .map(item => typeof item === 'object' ? item.number : item)
                    .filter(num => typeof num === 'number');
                
                console.log('✅ Números cantados cargados:', this.calledNumbers.length);
                
                // Marcar en historial
                this.generateNumbersGrid();
                
                // Mostrar último número
                if (this.calledNumbers.length > 0) {
                    const lastNumber = this.calledNumbers[this.calledNumbers.length - 1];
                    const letter = this.getBingoLetter(lastNumber);
                    this.updateRecentNumbers(letter, lastNumber);
                }
            }
            
        } catch (error) {
            console.error('❌ Error cargando estado:', error);
        }
    }

    markCardsInUse() {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;
        
        const { database, ref, get, set } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
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
                set(ref(database, `playerCards/${cleanPhone}`), allCards);
                console.log('✅ Cartones marcados como en uso');
            }
        });
    }

    markCardsExpired(reason = 'Juego completado') {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;
        
        const { database, ref, get, set } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        get(ref(database, `playerCards/${cleanPhone}`)).then((snapshot) => {
            let allCards = snapshot.val() || [];
            
            allCards.forEach(card => {
                if (card.status === 'en_uso' || card.status === 'vigente') {
                    card.status = 'vencido';
                    card.expiredDate = new Date().toISOString();
                    card.expiredReason = reason;
                }
            });
            
            set(ref(database, `playerCards/${cleanPhone}`), allCards);
            this.cards = [];
            this.showAccessBlocked();
            console.log('🗑️ Cartones expirados:', reason);
        });
    }

    saveCards() {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;
        
        const { database, ref, set, get } = window.firebase;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        get(ref(database, `playerCards/${cleanPhone}`)).then((snapshot) => {
            let allCards = snapshot.val() || [];
            
            this.cards.forEach(activeCard => {
                const index = allCards.findIndex(c => c.id === activeCard.id);
                if (index !== -1) {
                    allCards[index] = activeCard;
                }
            });
            
            return set(ref(database, `playerCards/${cleanPhone}`), allCards);
        });
    }

    // === UI HELPERS ===
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
        
        message.textContent = `Cartón ${data.cartonId} cantó ${data.typeText}. Verificando...`;
        alert.style.display = 'flex';
    }

    closeWinnerAlert() {
        document.getElementById('winner-alert').style.display = 'none';
    }
}

// Inicializar
let gameRoom;
document.addEventListener('DOMContentLoaded', () => {
    gameRoom = new GameRoom();
});