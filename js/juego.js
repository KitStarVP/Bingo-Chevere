// Sistema de Juego Robusto - Sin Fallos
class GameRoom {
    constructor() {
        this.cards = [];
        this.calledNumbers = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.currentPattern = null;
        this.userPhone = localStorage.getItem('userPhone');
        this.wakeLock = null;
        this.listeners = [];
        this.syncInProgress = false;
        this.lastSync = 0;
        this.init();
    }

    init() {
        if (!this.userPhone) {
            window.location.href = 'index.html';
            return;
        }
        this.checkSafariAndShowModal();
        this.requestWakeLock();
        this.waitForFirebase();
    }

    waitForFirebase() {
        const check = () => {
            if (window.firebase) {
                this.setupFirebaseListeners();
                this.loadInitialData();
            } else {
                setTimeout(check, 500);
            }
        };
        check();
    }

    async loadInitialData() {
        try {
            const { database, ref, get } = window.firebase;
            const cleanPhone = this.userPhone.replace(/[^0-9]/g, '');

            // Cargar cartones
            const cardsSnap = await get(ref(database, `playerCards/${cleanPhone}`));
            if (cardsSnap.exists()) {
                this.processCardsData(cardsSnap.val());
            }

            // Cargar números cantados
            const numbersSnap = await get(ref(database, 'calledNumbers'));
            if (numbersSnap.exists()) {
                this.calledNumbers = numbersSnap.val() || [];
            }

            // Cargar estado del juego
            const gameSnap = await get(ref(database, 'gameState'));
            if (gameSnap.exists()) {
                const gameState = gameSnap.val();
                this.gameActive = gameState.active || false;
                this.currentRound = gameState.currentRound || 1;
                this.currentPattern = gameState.currentPattern;
            }

            // Sincronizar todo
            this.syncAll();
            this.generateNumbersGrid();
            this.updateGameInfo();
            this.updateCurrentBall();

        } catch (error) {
            console.error('Error cargando datos:', error);
            setTimeout(() => this.loadInitialData(), 2000);
        }
    }

    processCardsData(firebaseCards) {
        if (!Array.isArray(firebaseCards)) return;

        this.cards = firebaseCards.filter(card => 
            card && (card.status === 'vigente' || card.status === 'en_uso')
        );

        this.cards.forEach(card => {
            if (!card.marked) card.marked = ['2-2'];
            if (!card.id) card.id = Date.now() + Math.random();
            if (!card.bingoSent) card.bingoSent = false;
        });

        if (this.cards.length === 0) {
            document.getElementById('empty-state').style.display = 'flex';
        } else {
            document.getElementById('empty-state').style.display = 'none';
        }
    }

    setupFirebaseListeners() {
        const { database, ref, onValue } = window.firebase;
        const cleanPhone = this.userPhone.replace(/[^0-9]/g, '');

        // Listener: Cartones
        this.listeners.push(
            onValue(ref(database, `playerCards/${cleanPhone}`), (snapshot) => {
                if (snapshot.exists()) {
                    this.processCardsData(snapshot.val());
                    this.syncAll();
                }
            }, (error) => console.error('Error listener cartones:', error))
        );

        // Listener: Números cantados
        this.listeners.push(
            onValue(ref(database, 'calledNumbers'), (snapshot) => {
                const newNumbers = snapshot.val() || [];
                if (JSON.stringify(newNumbers) !== JSON.stringify(this.calledNumbers)) {
                    // Detectar si hay un nuevo número
                    if (newNumbers.length > this.calledNumbers.length) {
                        const newNumber = newNumbers[newNumbers.length - 1];
                        console.log(`📢 Nuevo número detectado: ${newNumber}`);
                        
                        // Reproducir audio del nuevo número
                        this.playNumberAudio(newNumber);
                    }
                    
                    this.calledNumbers = newNumbers;
                    this.syncAll();
                }
            }, (error) => console.error('Error listener números:', error))
        );

        // Listener: Estado del juego
        this.listeners.push(
            onValue(ref(database, 'gameState'), (snapshot) => {
                if (snapshot.exists()) {
                    const gameState = snapshot.val();
                    const oldActive = this.gameActive;
                    const oldPaused = gameState.paused;
                    const oldRound = this.currentRound;

                    this.gameActive = gameState.active || false;
                    this.currentRound = gameState.currentRound || 1;
                    this.currentPattern = gameState.currentPattern;

                    // Detectar inicio del juego
                    if (!oldActive && this.gameActive) {
                        console.log('🎮 Juego iniciado, reproduciendo secuencia de bienvenida...');
                        this.playGameStartSequence();
                    }
                    
                    // Detectar cambio a Ronda 2
                    if (oldRound === 1 && this.currentRound === 2) {
                        console.log('🔄 Cambio a Ronda 2 detectado...');
                        this.playRoundTwoSequence();
                    }

                    if (gameState.paused && !oldPaused) {
                        this.showBigAlert('⏸️ JUEGO PAUSADO', 'El administrador ha pausado el juego temporalmente');
                    } else if (!gameState.paused && oldPaused) {
                        this.showBigAlert('▶️ JUEGO REANUDADO', 'El juego continúa, ¡buena suerte!');
                    }

                    if (gameState.gameFinalized) {
                        this.showBigAlert('🏁 JUEGO FINALIZADO', 'El juego ha terminado. Gracias por participar');
                        this.playGameEndSequence();
                    }

                    this.updateGameInfo();
                }
            }, (error) => console.error('Error listener gameState:', error))
        );
        
        // Listener: Compras (para actualizar premios)
        this.listeners.push(
            onValue(ref(database, 'purchases'), (snapshot) => {
                // Actualizar premio cuando cambien las compras
                this.updatePrizeDisplay();
            }, (error) => console.error('Error listener purchases:', error))
        );

        // Listener: Alertas BINGO
        this.listeners.push(
            onValue(ref(database, 'bingoAlerts'), (snapshot) => {
                const alerts = snapshot.val();
                if (alerts && Object.keys(alerts).length > 0) {
                    this.showGlobalBingoAlert();
                    const firstAlert = Object.values(alerts)[0];
                    if (firstAlert.phone !== this.userPhone) {
                        this.showToast('🎯 BINGO en verificación...');
                    }
                } else {
                    this.hideGlobalBingoAlert();
                }
            }, (error) => console.error('Error listener bingoAlerts:', error))
        );

        // Listener: Resultado BINGO
        this.listeners.push(
            onValue(ref(database, 'bingoResult'), (snapshot) => {
                if (snapshot.exists()) {
                    this.handleBingoResult(snapshot.val());
                }
            }, (error) => console.error('Error listener bingoResult:', error))
        );

        // Listener: Reset Ronda 2
        this.listeners.push(
            onValue(ref(database, 'roundTwoReset'), (snapshot) => {
                if (snapshot.exists() && snapshot.val().reset) {
                    this.handleRoundTwoReset();
                }
            }, (error) => console.error('Error listener roundTwoReset:', error))
        );

        // Botones
        document.getElementById('history-btn')?.addEventListener('click', () => this.showHistory());
        document.getElementById('close-history')?.addEventListener('click', () => this.closeHistory());
        document.getElementById('pattern-btn')?.addEventListener('click', () => this.showPattern());
        document.getElementById('close-pattern')?.addEventListener('click', () => this.closePattern());
        document.getElementById('close-winner')?.addEventListener('click', () => this.closeWinner());
    }

    syncAll() {
        if (this.syncInProgress) return;
        if (Date.now() - this.lastSync < 100) return;

        this.syncInProgress = true;
        this.lastSync = Date.now();

        try {
            this.autoMarkAllCards();
            this.checkAllCardsForBingo();
            this.renderCards();
            this.updateNumbersGrid();
            this.updateCurrentBall();
        } catch (error) {
            console.error('Error en sincronización:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    autoMarkAllCards() {
        if (!this.cards || this.cards.length === 0) return;

        this.cards.forEach(card => {
            if (!card.marked) card.marked = ['2-2'];
            if (!card.numbers) return;

            let changed = false;

            this.calledNumbers.forEach(number => {
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (card.numbers[row][col] === number) {
                            const key = `${row}-${col}`;
                            if (!card.marked.includes(key)) {
                                card.marked.push(key);
                                changed = true;
                            }
                        }
                    }
                }
            });

            if (!card.marked.includes('2-2')) {
                card.marked.push('2-2');
                changed = true;
            }

            if (changed) {
                this.saveCardToFirebase(card);
            }
        });
    }

    checkAllCardsForBingo() {
        if (!this.gameActive) return;

        this.cards.forEach(card => {
            if (card.bingoSent) return;

            const hasBingo = this.validateBingo(card);
            if (hasBingo) {
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
        if (!this.currentPattern || !this.currentPattern.positions) return false;

        const markedSet = new Set(card.marked);
        if (!markedSet.has('2-2')) return false;

        for (const [row, col] of this.currentPattern.positions) {
            if (!markedSet.has(`${row}-${col}`)) return false;
        }

        return true;
    }

    checkFullCard(card) {
        if (!card.marked || card.marked.length < 25) return false;

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (!card.marked.includes(`${row}-${col}`)) return false;
            }
        }

        return true;
    }

    async sendBingoAlert(card) {
        try {
            // Reproducir secuencia de BINGO cantado
            if (window.audioSystem) {
                try {
                    await window.audioSystem.playBingoSequence();
                } catch (audioError) {
                    console.warn('⚠️ Error reproduciendo audio de BINGO:', audioError);
                }
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

            const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await set(ref(database, `bingoAlerts/${alertId}`), alert);

            console.log('🎯 BINGO enviado');
        } catch (error) {
            console.error('Error enviando BINGO:', error);
            card.bingoSent = false;
        }
    }

    showGlobalBingoAlert() {
        const alert = document.getElementById('bingo-alert');
        if (alert) alert.style.display = 'flex';
    }

    hideGlobalBingoAlert() {
        const alert = document.getElementById('bingo-alert');
        if (alert) alert.style.display = 'none';
    }

    async handleBingoResult(result) {
        this.hideGlobalBingoAlert();

        const isMyBingo = result.winner && result.winner.phone === this.userPhone;

        if (result.isValid) {
            // Reproducir audio de BINGO correcto
            if (window.audioSystem) {
                try {
                    await window.audioSystem.playBingoResult(true);
                } catch (audioError) {
                    console.warn('⚠️ Error reproduciendo audio de resultado:', audioError);
                }
            }
            
            if (isMyBingo) {
                this.showWinnerAlert(result.winner);
            } else {
                this.showToast('✅ BINGO válido');
            }
            // Limpiar resultado para evitar repetición
            this.clearBingoResult();
        } else {
            // Reproducir audio de BINGO incorrecto
            if (window.audioSystem) {
                try {
                    await window.audioSystem.playBingoResult(false);
                } catch (audioError) {
                    console.warn('⚠️ Error reproduciendo audio de resultado:', audioError);
                }
            }
            
            this.showToast('❌ BINGO rechazado');
            this.cards.forEach(card => card.bingoSent = false);
            this.clearBingoResult();
        }
    }

    showWinnerAlert(winner) {
        const alert = document.getElementById('winner-alert');
        const msg = document.getElementById('winner-msg');
        const prize = document.getElementById('winner-prize');

        if (alert && msg && prize) {
            msg.textContent = `¡Has ganado ${winner.type || 'el premio'}!`;
            prize.textContent = `BsF ${winner.amount || 0}`;
            alert.style.display = 'flex';
        }
    }

    closeWinner() {
        const alert = document.getElementById('winner-alert');
        if (alert) alert.style.display = 'none';
    }

    async clearBingoResult() {
        try {
            const { database, ref, set } = window.firebase;
            await set(ref(database, 'bingoResult'), null);
        } catch (error) {
            console.error('Error limpiando resultado:', error);
        }
    }

    async handleRoundTwoReset() {
        console.log('🔄 Limpiando cartones para Ronda 2');
        
        // Reproducir audio de segunda ronda
        if (window.audioSystem) {
            try {
                await window.audioSystem.playPhrase('round-2');
            } catch (audioError) {
                console.warn('⚠️ Error reproduciendo audio de ronda 2:', audioError);
            }
        }
        
        this.calledNumbers = [];
        
        // Limpiar TODOS los cartones (solo FREE marcado)
        this.cards.forEach(card => {
            card.marked = ['2-2'];
            card.bingoSent = false;
            this.saveCardToFirebase(card);
        });

        this.syncAll();
        this.generateNumbersGrid();
        
        const currentBall = document.getElementById('current-ball');
        if (currentBall) currentBall.textContent = '--';

        this.showBigAlert('🔄 RONDA 2 INICIADA', 'Cartones limpios, nueva ronda comenzando...');

        try {
            const { database, ref, set } = window.firebase;
            await set(ref(database, 'roundTwoReset'), null);
        } catch (error) {
            console.error('Error limpiando reset:', error);
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

        const cardCode = card.code || `C${card.id}`;
        const progress = Math.round((card.marked.length / 25) * 100);

        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = `
            <span class="card-code">${cardCode}</span>
            <span class="card-progress">${card.marked.length}/25 (${progress}%)</span>
        `;

        const letters = document.createElement('div');
        letters.className = 'bingo-letters';
        ['B', 'I', 'N', 'G', 'O'].forEach(letter => {
            const span = document.createElement('span');
            span.textContent = letter;
            letters.appendChild(span);
        });

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

                let isPatternCell = false;
                if (this.currentRound === 1 && this.currentPattern && this.currentPattern.positions) {
                    isPatternCell = this.currentPattern.positions.some(pos => pos[0] === row && pos[1] === col);
                }

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

    updateGameInfo() {
        const roundEl = document.getElementById('round');
        if (roundEl) roundEl.textContent = `${this.currentRound}/2`;
        
        // Actualizar premio dinámicamente
        this.updatePrizeDisplay();
    }

    async updatePrizeDisplay() {
        try {
            const { database, ref, get } = window.firebase;
            
            // Obtener pagos verificados
            const purchasesSnap = await get(ref(database, 'purchases'));
            const purchases = purchasesSnap.val();
            
            if (!purchases) {
                document.getElementById('prize').textContent = '0';
                return;
            }
            
            const verified = Object.values(purchases).filter(p => p.status === 'verified');
            const ticketsSold = verified.reduce((sum, p) => sum + (p.cartones || 0), 0);
            const totalCollected = ticketsSold * 60; // 60 BsF por cartón
            const totalPrizes = totalCollected * 0.75; // 75% para premios
            
            let currentRoundPrize = 0;
            if (this.currentRound === 1) {
                currentRoundPrize = totalPrizes * 0.25; // 25% para Ronda 1
            } else {
                currentRoundPrize = totalPrizes * 0.75; // 75% para Ronda 2
            }
            
            const prizeEl = document.getElementById('prize');
            if (prizeEl) {
                prizeEl.textContent = Math.round(currentRoundPrize);
            }
            
        } catch (error) {
            console.error('Error actualizando premio:', error);
            document.getElementById('prize').textContent = '0';
        }
    }

    updateCurrentBall() {
        const currentBall = document.getElementById('current-ball');
        if (!currentBall) return;

        if (this.calledNumbers.length > 0) {
            const lastNumber = this.calledNumbers[this.calledNumbers.length - 1];
            const letter = this.getBingoLetter(lastNumber);
            currentBall.textContent = `${letter}${lastNumber}`;
        } else {
            currentBall.textContent = '--';
        }
    }

    // Reproducir audio cuando se canta un número
    async playNumberAudio(number) {
        if (!window.audioSystem) {
            console.warn('⚠️ Sistema de audio no disponible para reproducir número:', number);
            return;
        }
        
        try {
            console.log(`🎵 Reproduciendo audio para número: ${number}`);
            
            // Reproducir frase de transición ocasionalmente (20% probabilidad)
            if (Math.random() < 0.2) {
                await window.audioSystem.playRandomTransition();
                await window.audioSystem.delay(800);
            }
            
            // Reproducir el número
            const success = await window.audioSystem.announceNumber(number);
            
            if (success) {
                console.log(`✅ Audio reproducido exitosamente para número: ${number}`);
            } else {
                console.warn(`⚠️ No se pudo reproducir audio para número: ${number}`);
            }
            
            // Reproducir frase de ambiente ocasionalmente (15% probabilidad)
            if (Math.random() < 0.15) {
                setTimeout(async () => {
                    try {
                        await window.audioSystem.playRandomAmbient();
                    } catch (error) {
                        console.warn('⚠️ Error reproduciendo frase ambiente:', error);
                    }
                }, 2000);
            }
            
        } catch (error) {
            console.error(`❌ Error reproduciendo audio para número ${number}:`, error);
        }
    }

    // Reproducir secuencia de inicio del juego
    async playGameStartSequence() {
        if (!window.audioSystem) {
            console.warn('⚠️ Sistema de audio no disponible para secuencia de inicio');
            return;
        }
        
        try {
            console.log('🎬 Reproduciendo secuencia de inicio del juego...');
            await window.audioSystem.playGameStart();
            console.log('✅ Secuencia de inicio completada');
        } catch (error) {
            console.error('❌ Error en secuencia de inicio:', error);
        }
    }
    
    // Reproducir secuencia de Ronda 2
    async playRoundTwoSequence() {
        if (!window.audioSystem) {
            console.warn('⚠️ Sistema de audio no disponible para Ronda 2');
            return;
        }
        
        try {
            console.log('🔄 Reproduciendo secuencia de Ronda 2...');
            await window.audioSystem.playPhrase('round-2');
            console.log('✅ Secuencia de Ronda 2 completada');
        } catch (error) {
            console.error('❌ Error en secuencia de Ronda 2:', error);
        }
    }
    
    // Reproducir secuencia de fin del juego
    async playGameEndSequence() {
        if (!window.audioSystem) {
            console.warn('⚠️ Sistema de audio no disponible para fin del juego');
            return;
        }
        
        try {
            console.log('🏁 Reproduciendo secuencia de fin del juego...');
            await window.audioSystem.playPhrase('thanks');
            console.log('✅ Secuencia de fin completada');
        } catch (error) {
            console.error('❌ Error en secuencia de fin:', error);
        }
    }

    getBingoLetter(number) {
        if (number <= 15) return 'B';
        if (number <= 30) return 'I';
        if (number <= 45) return 'N';
        if (number <= 60) return 'G';
        return 'O';
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

    updateNumbersGrid() {
        this.calledNumbers.forEach(num => {
            const cell = document.getElementById(`num-${num}`);
            if (cell && !cell.classList.contains('called')) {
                cell.classList.add('called');
            }
        });
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
            window.modal.info('El patrón solo aplica en Ronda 1');
            return;
        }

        if (!this.currentPattern || !this.currentPattern.positions) {
            window.modal.warning('No hay patrón definido');
            return;
        }

        const modal = document.getElementById('pattern-modal');
        const display = document.getElementById('pattern-display');

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

    showBigAlert(title, message) {
        let alert = document.getElementById('game-big-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.id = 'game-big-alert';
            alert.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);display:none;align-items:center;justify-content:center;z-index:99999;';
            alert.innerHTML = `
                <div style="background:white;border-radius:20px;padding:40px;max-width:400px;text-align:center;">
                    <div id="big-alert-icon" style="font-size:64px;margin-bottom:20px;"></div>
                    <h2 id="big-alert-title" style="margin:0 0 16px 0;font-size:24px;font-weight:800;color:#333;"></h2>
                    <p id="big-alert-message" style="margin:0;font-size:16px;color:#666;line-height:1.5;"></p>
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

    checkSafariAndShowModal() {
        // Detectar Safari (iOS y Mac)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isSafari && 'speechSynthesis' in window) {
            this.showSafariModal();
        }
    }

    showSafariModal() {
        const modal = document.createElement('div');
        modal.id = 'safari-audio-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:99999;';
        
        modal.innerHTML = `
            <div style="background:white;border-radius:20px;padding:32px;max-width:320px;text-align:center;">
                <div style="font-size:48px;margin-bottom:16px;">🎮</div>
                <h2 style="margin:0 0 12px 0;font-size:22px;font-weight:800;color:#333;">Bienvenido al Bingo</h2>
                <p style="margin:0 0 24px 0;font-size:15px;color:#666;line-height:1.5;">Toca el botón para activar el sonido y comenzar a jugar</p>
                <button id="safari-enter-btn" style="width:100%;padding:16px;background:linear-gradient(135deg,#6C63FF,#5a52d5);color:white;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(108,99,255,0.3);">
                    🔊 Entrar al Juego
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('safari-enter-btn').addEventListener('click', async () => {
            // Activar audio del nuevo sistema
            if (window.audioSystem) {
                try {
                    // Pre-cargar un audio silencioso para activar el contexto de audio
                    const audio = new Audio();
                    audio.volume = 0;
                    audio.play().catch(() => {});
                } catch (error) {
                    console.log('Audio context activation:', error);
                }
            }
            console.log('🔊 Audio activado para iOS/Safari');
            modal.remove();
        });
    }

    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('🔆 Pantalla activa');
                
                document.addEventListener('visibilitychange', async () => {
                    if (this.wakeLock !== null && document.visibilityState === 'visible') {
                        this.wakeLock = await navigator.wakeLock.request('screen');
                    }
                });
            } catch (err) {
                console.log('⚠️ Wake lock no disponible');
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar que el sistema de audio esté disponible
    const initGame = () => {
        if (window.audioSystem) {
            console.log('🎵 Sistema de audio disponible, iniciando juego...');
            window.gameRoom = new GameRoom();
        } else {
            console.log('⏳ Esperando sistema de audio...');
            setTimeout(initGame, 100);
        }
    };
    
    initGame();
});
