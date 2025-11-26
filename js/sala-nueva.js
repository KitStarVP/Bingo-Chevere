/**
 * SALA DE JUEGO NUEVA - CÓDIGO LIMPIO Y OPTIMIZADO
 * Sistema completo de Bingo con audio perfecto
 */

class BingoGameRoom {
    constructor() {
        // Estado del juego
        this.userPhone = localStorage.getItem('userPhone');
        this.cards = [];
        this.calledNumbers = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.currentPattern = null;
        this.gameState = null;
        
        // Control de sincronización
        this.isUpdating = false;
        this.lastUpdate = 0;
        
        // Listeners de Firebase
        this.firebaseListeners = [];
        
        // Inicializar
        this.init();
    }

    async init() {
        // Verificar usuario
        if (!this.userPhone) {
            window.location.href = 'index.html';
            return;
        }

        console.log('🎮 Iniciando Sala de Juego Nueva');
        
        // Esperar Firebase y Audio
        await this.waitForDependencies();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Cargar datos iniciales
        await this.loadInitialData();
        
        // Configurar Firebase listeners
        this.setupFirebaseListeners();
        
        // Activar audio en Safari/iOS
        this.handleSafariAudio();
        
        // Mantener pantalla activa
        this.requestWakeLock();
        
        console.log('✅ Sala de juego lista');
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.firebase && window.audioSystem) {
                    console.log('📦 Dependencias cargadas');
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    setupEventListeners() {
        // Botones del header
        document.getElementById('history-btn').addEventListener('click', () => this.showHistory());
        document.getElementById('pattern-btn').addEventListener('click', () => this.showPattern());
        
        // Cerrar modales
        document.getElementById('close-history').addEventListener('click', () => this.closeHistory());
        document.getElementById('close-pattern').addEventListener('click', () => this.closePattern());
        document.getElementById('close-winner').addEventListener('click', () => this.closeWinner());
        
        // Cerrar modales al hacer clic fuera
        document.getElementById('history-modal').addEventListener('click', (e) => {
            if (e.target.id === 'history-modal') this.closeHistory();
        });
        document.getElementById('pattern-modal').addEventListener('click', (e) => {
            if (e.target.id === 'pattern-modal') this.closePattern();
        });
    }

    async loadInitialData() {
        try {
            console.log('📥 Cargando datos iniciales...');
            
            const { database, ref, get } = window.firebase;
            const cleanPhone = this.userPhone.replace(/[^0-9]/g, '');

            // Cargar en paralelo para mayor velocidad
            const [cardsSnap, numbersSnap, gameSnap, purchasesSnap] = await Promise.all([
                get(ref(database, `playerCards/${cleanPhone}`)),
                get(ref(database, 'calledNumbers')),
                get(ref(database, 'gameState')),
                get(ref(database, 'purchases'))
            ]);

            // Procesar cartones
            if (cardsSnap.exists()) {
                this.processCards(cardsSnap.val());
            }

            // Procesar números cantados
            if (numbersSnap.exists()) {
                this.calledNumbers = numbersSnap.val() || [];
            }

            // Procesar estado del juego
            if (gameSnap.exists()) {
                this.gameState = gameSnap.val();
                this.gameActive = this.gameState.active || false;
                this.currentRound = this.gameState.currentRound || 1;
                this.currentPattern = this.gameState.currentPattern;
            }

            // Actualizar interfaz
            this.updateUI();
            this.generateNumbersGrid();
            
            console.log('✅ Datos iniciales cargados');
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.showToast('Error cargando datos del juego');
        }
    }

    processCards(firebaseCards) {
        if (!Array.isArray(firebaseCards)) {
            this.cards = [];
            return;
        }

        // Filtrar solo cartones válidos
        this.cards = firebaseCards.filter(card => 
            card && 
            card.numbers && 
            (card.status === 'vigente' || card.status === 'en_uso')
        );

        // Inicializar propiedades de cartones
        this.cards.forEach(card => {
            if (!card.marked) card.marked = ['2-2']; // FREE siempre marcado
            if (!card.id) card.id = `card_${Date.now()}_${Math.random()}`;
            if (!card.bingoSent) card.bingoSent = false;
        });

        console.log(`🎫 ${this.cards.length} cartones cargados`);
    }

    setupFirebaseListeners() {
        const { database, ref, onValue } = window.firebase;
        const cleanPhone = this.userPhone.replace(/[^0-9]/g, '');

        // Listener: Cartones del jugador
        this.firebaseListeners.push(
            onValue(ref(database, `playerCards/${cleanPhone}`), (snapshot) => {
                if (snapshot.exists()) {
                    this.processCards(snapshot.val());
                    this.syncCards();
                }
            })
        );

        // Listener: Números cantados (PRINCIPAL)
        this.firebaseListeners.push(
            onValue(ref(database, 'calledNumbers'), (snapshot) => {
                const newNumbers = snapshot.val() || [];
                
                // Detectar nuevo número
                if (newNumbers.length > this.calledNumbers.length) {
                    const newNumber = newNumbers[newNumbers.length - 1];
                    console.log(`📢 Nuevo número: ${newNumber}`);
                    
                    // Reproducir audio inmediatamente
                    this.playNumberAudio(newNumber);
                }
                
                this.calledNumbers = newNumbers;
                this.syncCards();
            })
        );

        // Listener: Estado del juego
        this.firebaseListeners.push(
            onValue(ref(database, 'gameState'), (snapshot) => {
                if (snapshot.exists()) {
                    const newState = snapshot.val();
                    this.handleGameStateChange(newState);
                    this.gameState = newState;
                }
            })
        );

        // Listener: Alertas BINGO
        this.firebaseListeners.push(
            onValue(ref(database, 'bingoAlerts'), (snapshot) => {
                const alerts = snapshot.val();
                if (alerts && Object.keys(alerts).length > 0) {
                    // Reproducir audio "Han cantado BINGO" para TODOS
                    if (window.audioSystem) {
                        window.audioSystem.playBingoSequence();
                    }
                    this.showBingoAlert();
                } else {
                    this.hideBingoAlert();
                }
            })
        );

        // Listener: Resultado BINGO
        this.firebaseListeners.push(
            onValue(ref(database, 'bingoResult'), (snapshot) => {
                if (snapshot.exists()) {
                    this.handleBingoResult(snapshot.val());
                }
            })
        );

        // Listener: Reset Ronda 2
        this.firebaseListeners.push(
            onValue(ref(database, 'roundTwoReset'), (snapshot) => {
                if (snapshot.exists() && snapshot.val().reset) {
                    this.handleRoundTwoReset();
                }
            })
        );

        console.log('👂 Listeners de Firebase configurados');
    }

    handleGameStateChange(newState) {
        const oldActive = this.gameActive;
        const oldRound = this.currentRound;
        
        this.gameActive = newState.active || false;
        this.currentRound = newState.currentRound || 1;
        this.currentPattern = newState.currentPattern;

        // Detectar inicio del juego
        if (!oldActive && this.gameActive) {
            console.log('🎮 Juego iniciado');
            this.playGameStartAudio();
        }

        // Detectar cambio a Ronda 2
        if (oldRound === 1 && this.currentRound === 2) {
            console.log('🔄 Cambio a Ronda 2');
            this.playRoundTwoAudio();
        }

        // Manejar pausas
        if (newState.paused && !this.gameState?.paused) {
            this.showGameAlert('⏸️ JUEGO PAUSADO', 'El juego ha sido pausado temporalmente');
        } else if (!newState.paused && this.gameState?.paused) {
            this.showGameAlert('▶️ JUEGO REANUDADO', 'El juego continúa');
        }

        // Manejar finalización
        if (newState.gameFinalized) {
            this.showGameAlert('🏁 JUEGO FINALIZADO', 'Gracias por participar');
            this.playGameEndAudio();
        }

        this.updateUI();
    }

    syncCards() {
        if (this.isUpdating) return;
        if (Date.now() - this.lastUpdate < 50) return; // Throttle
        
        this.isUpdating = true;
        this.lastUpdate = Date.now();

        try {
            // Marcar números automáticamente
            this.autoMarkCards();
            
            // Verificar BINGO
            this.checkForBingo();
            
            // Actualizar interfaz
            this.renderCards();
            this.updateNumbersGrid();
            this.updateCurrentBall();
            
        } finally {
            this.isUpdating = false;
        }
    }

    autoMarkCards() {
        let hasChanges = false;

        this.cards.forEach(card => {
            const oldMarked = [...card.marked];
            
            // Marcar números cantados
            this.calledNumbers.forEach(number => {
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (card.numbers[row][col] === number) {
                            const key = `${row}-${col}`;
                            if (!card.marked.includes(key)) {
                                card.marked.push(key);
                                hasChanges = true;
                            }
                        }
                    }
                }
            });

            // Asegurar FREE marcado
            if (!card.marked.includes('2-2')) {
                card.marked.push('2-2');
                hasChanges = true;
            }

            // Guardar si hay cambios
            if (JSON.stringify(oldMarked) !== JSON.stringify(card.marked)) {
                this.saveCardToFirebase(card);
            }
        });
    }

    checkForBingo() {
        if (!this.gameActive) return;

        this.cards.forEach(card => {
            if (card.bingoSent) return;

            const hasBingo = this.validateBingo(card);
            if (hasBingo) {
                console.log('🎯 BINGO detectado en cartón:', card.code);
                card.bingoSent = true;
                this.sendBingoAlert(card);
            }
        });
    }

    validateBingo(card) {
        if (!card.marked || card.marked.length === 0) return false;

        if (this.currentRound === 1) {
            return this.checkPattern(card);
        } else {
            return this.checkFullCard(card);
        }
    }

    checkPattern(card) {
        if (!this.currentPattern?.positions) return false;

        const markedSet = new Set(card.marked);
        
        // Verificar todas las posiciones del patrón
        return this.currentPattern.positions.every(([row, col]) => 
            markedSet.has(`${row}-${col}`)
        );
    }

    checkFullCard(card) {
        if (card.marked.length < 25) return false;

        // Verificar que todas las posiciones estén marcadas
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (!card.marked.includes(`${row}-${col}`)) {
                    return false;
                }
            }
        }
        return true;
    }

    async sendBingoAlert(card) {
        try {
            // Reproducir audio de BINGO para TODOS (incluso si no es tu cartón)
            if (window.audioSystem) {
                await window.audioSystem.playBingoSequence();
            }

            const { database, ref, set } = window.firebase;
            
            const alert = {
                phone: this.userPhone,
                cartonCode: card.code,
                carton: card.numbers,
                marked: card.marked,
                round: this.currentRound,
                timestamp: Date.now(),
                numbersUsed: [...this.calledNumbers]
            };

            const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await set(ref(database, `bingoAlerts/${alertId}`), alert);

            console.log('📤 BINGO enviado');
            
        } catch (error) {
            console.error('❌ Error enviando BINGO:', error);
            card.bingoSent = false;
        }
    }

    async handleBingoResult(result) {
        this.hideBingoAlert();

        if (result.isValid) {
            // BINGO válido
            if (window.audioSystem) {
                await window.audioSystem.playBingoResult(true);
            }
            
            if (result.winner?.phone === this.userPhone) {
                this.showWinnerAlert(result.winner);
            } else {
                this.showToast('✅ BINGO válido confirmado');
            }
        } else {
            // BINGO inválido
            if (window.audioSystem) {
                await window.audioSystem.playBingoResult(false);
            }
            
            this.showToast('❌ BINGO rechazado');
            
            // Resetear flags de BINGO
            this.cards.forEach(card => card.bingoSent = false);
        }

        // Limpiar resultado
        this.clearBingoResult();
    }

    async handleRoundTwoReset() {
        console.log('🔄 Reseteando para Ronda 2 - LIMPIEZA COMPLETA');
        
        // Audio de Ronda 2
        if (window.audioSystem) {
            await window.audioSystem.playPhrase('round-2');
        }
        
        // Limpiar números locales
        this.calledNumbers = [];
        
        // LIMPIAR TODOS LOS CARTONES COMPLETAMENTE (solo FREE marcado)
        this.cards.forEach(card => {
            card.marked = ['2-2']; // Solo FREE
            card.bingoSent = false;
        });
        
        // Guardar TODOS los cartones limpios en Firebase
        await this.saveAllCardsToFirebase();

        // Actualizar interfaz
        this.syncCards();
        this.generateNumbersGrid();
        document.getElementById('current-ball').textContent = '--';
        
        this.showGameAlert('🔄 RONDA 2 INICIADA', 'Cartones 100% limpios, nueva ronda comenzando');

        // Limpiar flag de reset
        try {
            const { database, ref, set } = window.firebase;
            await set(ref(database, 'roundTwoReset'), null);
        } catch (error) {
            console.error('Error limpiando reset:', error);
        }
    }
    
    async saveAllCardsToFirebase() {
        try {
            const { database, ref, get, set } = window.firebase;
            const cleanPhone = this.userPhone.replace(/[^0-9]/g, '');
            
            // Obtener todos los cartones actuales de Firebase
            const snapshot = await get(ref(database, `playerCards/${cleanPhone}`));
            if (!snapshot.exists()) return;
            
            const firebaseCards = snapshot.val();
            if (!Array.isArray(firebaseCards)) return;
            
            // Actualizar TODOS los cartones con marked = ['2-2']
            firebaseCards.forEach(card => {
                if (card.status === 'vigente' || card.status === 'en_uso') {
                    card.marked = ['2-2'];
                    card.bingoSent = false;
                }
            });
            
            // Guardar TODO de una vez
            await set(ref(database, `playerCards/${cleanPhone}`), firebaseCards);
            
            console.log('✅ Todos los cartones limpiados en Firebase');
            
        } catch (error) {
            console.error('❌ Error guardando todos los cartones:', error);
        }
    }

    // === AUDIO METHODS ===
    
    async playNumberAudio(number) {
        if (!window.audioSystem) return;
        
        try {
            console.log(`🎵 Reproduciendo: ${number}`);
            
            // Frase de transición ocasional
            if (Math.random() < 0.2) {
                await window.audioSystem.playRandomTransition();
                await new Promise(resolve => setTimeout(resolve, 800));
            }
            
            // Anunciar número
            await window.audioSystem.announceNumber(number);
            
            // Frase ambiente ocasional (después de 8 segundos)
            if (Math.random() < 0.15) {
                setTimeout(async () => {
                    try {
                        await window.audioSystem.playRandomAmbient();
                    } catch (e) {
                        console.warn('Error audio ambiente:', e);
                    }
                }, 2000); // Vuelto al original
            }
            
        } catch (error) {
            console.error('Error reproduciendo audio:', error);
        }
    }

    async playGameStartAudio() {
        if (window.audioSystem) {
            try {
                await window.audioSystem.playGameStart();
            } catch (error) {
                console.warn('Error audio inicio:', error);
            }
        }
    }

    async playRoundTwoAudio() {
        if (window.audioSystem) {
            try {
                await window.audioSystem.playPhrase('round-2');
            } catch (error) {
                console.warn('Error audio ronda 2:', error);
            }
        }
    }

    async playGameEndAudio() {
        if (window.audioSystem) {
            try {
                await window.audioSystem.playPhrase('thanks');
            } catch (error) {
                console.warn('Error audio fin:', error);
            }
        }
    }

    // === UI METHODS ===
    
    updateUI() {
        // Actualizar ronda
        document.getElementById('round-display').textContent = `${this.currentRound}/2`;
        
        // Actualizar premio
        this.updatePrizeDisplay();
        
        // Mostrar/ocultar cartones
        if (this.cards.length === 0) {
            document.getElementById('empty-state').style.display = 'flex';
            document.getElementById('cards-container').style.display = 'none';
        } else {
            document.getElementById('empty-state').style.display = 'none';
            document.getElementById('cards-container').style.display = 'grid';
        }
    }

    async updatePrizeDisplay() {
        try {
            const { database, ref, get } = window.firebase;
            
            const purchasesSnap = await get(ref(database, 'purchases'));
            const purchases = purchasesSnap.val();
            
            if (!purchases) {
                document.getElementById('prize-display').textContent = '0';
                return;
            }
            
            const verified = Object.values(purchases).filter(p => p.status === 'verified');
            const ticketsSold = verified.reduce((sum, p) => sum + (p.cartones || 0), 0);
            const totalCollected = ticketsSold * 60;
            const totalPrizes = totalCollected * 0.75;
            
            let currentPrize = 0;
            if (this.currentRound === 1) {
                currentPrize = totalPrizes * 0.25; // 25% Ronda 1
            } else {
                currentPrize = totalPrizes * 0.75; // 75% Ronda 2
            }
            
            document.getElementById('prize-display').textContent = Math.round(currentPrize);
            
        } catch (error) {
            console.error('Error actualizando premio:', error);
            document.getElementById('prize-display').textContent = '0';
        }
    }

    updateCurrentBall() {
        const currentBall = document.getElementById('current-ball');
        
        if (this.calledNumbers.length > 0) {
            const lastNumber = this.calledNumbers[this.calledNumbers.length - 1];
            const letter = this.getBingoLetter(lastNumber);
            currentBall.textContent = `${letter}${lastNumber}`;
        } else {
            currentBall.textContent = '--';
        }
    }

    renderCards() {
        const container = document.getElementById('cards-container');
        container.innerHTML = '';

        this.cards.forEach(card => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'bingo-card';

        // Header del cartón
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const progress = Math.round((card.marked.length / 25) * 100);
        header.innerHTML = `
            <span class="card-code">${card.code || 'C' + card.id}</span>
            <span class="card-progress">${card.marked.length}/25 (${progress}%)</span>
        `;

        // Letras BINGO
        const letters = document.createElement('div');
        letters.className = 'bingo-letters';
        ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
            const span = document.createElement('span');
            span.textContent = letter;
            letters.appendChild(span);
        });

        // Grid del cartón
        const grid = document.createElement('div');
        grid.className = 'card-grid';

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'card-cell';

                const number = card.numbers[row][col];
                const isFree = number === 0;
                const key = `${row}-${col}`;
                const isMarked = card.marked.includes(key);
                const wasCalled = this.calledNumbers.includes(number);

                // Verificar si es parte del patrón
                let isPatternCell = false;
                if (this.currentRound === 1 && this.currentPattern?.positions) {
                    isPatternCell = this.currentPattern.positions.some(pos => 
                        pos[0] === row && pos[1] === col
                    );
                }

                // Aplicar clases
                if (isMarked) cell.classList.add('marked');
                if (isFree) cell.classList.add('free');
                if (wasCalled) cell.classList.add('called');
                if (isPatternCell) cell.classList.add('pattern');

                cell.textContent = isFree ? 'FREE' : number;
                grid.appendChild(cell);
            }
        }

        cardDiv.appendChild(header);
        cardDiv.appendChild(letters);
        cardDiv.appendChild(grid);

        return cardDiv;
    }

    generateNumbersGrid() {
        const grid = document.getElementById('numbers-grid');
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

    updateNumbersGrid() {
        this.calledNumbers.forEach(num => {
            const cell = document.getElementById(`num-${num}`);
            if (cell && !cell.classList.contains('called')) {
                cell.classList.add('called');
            }
        });
    }

    // === MODAL METHODS ===
    
    showHistory() {
        document.getElementById('history-modal').classList.add('show');
    }

    closeHistory() {
        document.getElementById('history-modal').classList.remove('show');
    }

    showPattern() {
        if (this.currentRound !== 1) {
            this.showToast('El patrón solo aplica en Ronda 1');
            return;
        }

        if (!this.currentPattern?.positions) {
            this.showToast('No hay patrón definido');
            return;
        }

        const modal = document.getElementById('pattern-modal');
        const display = document.getElementById('pattern-display');
        
        // Limpiar display
        display.innerHTML = '';

        // Generar patrón visual
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const cell = document.createElement('div');
                cell.className = 'pattern-cell';

                const isActive = this.currentPattern.positions.some(pos => 
                    pos[0] === row && pos[1] === col
                );

                if (row === 2 && col === 2) {
                    cell.classList.add('free');
                    cell.textContent = 'FREE';
                } else if (isActive) {
                    cell.classList.add('active');
                    cell.textContent = '✓';
                }

                display.appendChild(cell);
            }
        }

        modal.classList.add('show');
    }

    closePattern() {
        document.getElementById('pattern-modal').classList.remove('show');
    }

    showBingoAlert() {
        document.getElementById('bingo-alert').style.display = 'flex';
    }

    hideBingoAlert() {
        document.getElementById('bingo-alert').style.display = 'none';
    }

    showWinnerAlert(winner) {
        const alert = document.getElementById('winner-alert');
        const message = document.getElementById('winner-message');
        const prize = document.getElementById('winner-prize');

        message.textContent = `¡Has ganado ${winner.type || 'el premio'}!`;
        prize.textContent = `BsF ${winner.amount || 0}`;
        alert.style.display = 'flex';
    }

    closeWinner() {
        document.getElementById('winner-alert').style.display = 'none';
    }

    // === UTILITY METHODS ===
    
    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
    }

    async saveCardToFirebase(card) {
        try {
            const { database, ref, get, set } = window.firebase;
            const cleanPhone = this.userPhone.replace(/[^0-9]/g, '');

            const snapshot = await get(ref(database, `playerCards/${cleanPhone}`));
            if (!snapshot.exists()) return;

            const firebaseCards = snapshot.val();
            if (!Array.isArray(firebaseCards)) return;

            const cardIndex = firebaseCards.findIndex(c => c.code === card.code);
            if (cardIndex === -1) return;

            firebaseCards[cardIndex].marked = card.marked;
            await set(ref(database, `playerCards/${cleanPhone}`), firebaseCards);

        } catch (error) {
            console.error('Error guardando cartón:', error);
        }
    }

    async clearBingoResult() {
        try {
            const { database, ref, set } = window.firebase;
            await set(ref(database, 'bingoResult'), null);
        } catch (error) {
            console.error('Error limpiando resultado:', error);
        }
    }

    showToast(message) {
        let toast = document.getElementById('game-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'game-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 9999;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: none;
            `;
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }

    showGameAlert(title, message) {
        let alert = document.getElementById('game-big-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'game-big-alert';
            alert.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.95);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 99999;
            `;
            alert.innerHTML = `
                <div style="background: white; border-radius: 20px; padding: 40px; max-width: 400px; text-align: center;">
                    <div id="big-alert-icon" style="font-size: 64px; margin-bottom: 20px;"></div>
                    <h2 id="big-alert-title" style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #333;"></h2>
                    <p id="big-alert-message" style="margin: 0; font-size: 16px; color: #666; line-height: 1.5;"></p>
                </div>
            `;
            document.body.appendChild(alert);
        }
        
        const icon = title.includes('PAUSADO') ? '⏸️' : 
                     title.includes('REANUDADO') ? '▶️' :
                     title.includes('RONDA 2') ? '🔄' :
                     title.includes('FINALIZADO') ? '🏁' : '🔔';
        
        document.getElementById('big-alert-icon').textContent = icon;
        document.getElementById('big-alert-title').textContent = title;
        document.getElementById('big-alert-message').textContent = message;
        
        alert.style.display = 'flex';
        setTimeout(() => { alert.style.display = 'none'; }, 4000);
    }

    handleSafariAudio() {
        // Modal para TODOS los dispositivos y navegadores
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
        `;
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 32px; max-width: 320px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 16px;">🎮</div>
                <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #333;">Bienvenido al Bingo</h2>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #666; line-height: 1.5;">Toca para activar el sonido y comenzar</p>
                <button id="safari-enter" style="width: 100%; padding: 16px; background: linear-gradient(135deg,#6C63FF,#5a52d5); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer;">
                    🔊 Entrar al Juego
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('safari-enter').addEventListener('click', () => {
            // Activar contexto de audio
            if (window.audioSystem) {
                const audio = new Audio();
                audio.volume = 0;
                audio.play().catch(() => {});
            }
            modal.remove();
        });
    }

    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                const wakeLock = await navigator.wakeLock.request('screen');
                console.log('🔆 Pantalla activa');
                
                document.addEventListener('visibilitychange', async () => {
                    if (wakeLock !== null && document.visibilityState === 'visible') {
                        await navigator.wakeLock.request('screen');
                    }
                });
            } catch (err) {
                console.log('⚠️ Wake lock no disponible');
            }
        }
    }

    destroy() {
        // Limpiar listeners
        this.firebaseListeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.firebaseListeners = [];
        
        console.log('🧹 Sala de juego destruida');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando nueva sala de juego...');
    window.bingoGameRoom = new BingoGameRoom();
});

// Limpiar al salir
window.addEventListener('beforeunload', () => {
    if (window.bingoGameRoom) {
        window.bingoGameRoom.destroy();
    }
});