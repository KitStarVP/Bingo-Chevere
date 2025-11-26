// Panel Admin Desktop - Sistema Completo
class DesktopAdmin {
    constructor() {
        this.payments = [];
        this.prizes = [];
        this.winners = [];
        this.users = [];
        this.currentFilter = 'pending';
        this.currentPrizeTab = 'pending';
        this.gameActive = false;
        this.currentRound = 1;
        this.isPaused = false;
        this.bingoCaller = null;
        this.bingoValidator = null;
        this.init();
    }

    init() {
        if (typeof BingoCaller !== 'undefined') {
            this.bingoCaller = new BingoCaller();
        }
        if (typeof BingoValidator !== 'undefined') {
            this.bingoValidator = new BingoValidator();
        }
        this.setupNavigation();
        this.loadPayments();
        this.loadPrizes();
        this.loadWinners();
        this.loadUsers();
        this.setupListeners();
        this.startRealTimeUpdates();
        this.checkPendingBingo();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    showSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId)?.classList.add('active');
    }

    setupListeners() {
        document.getElementById('start-game')?.addEventListener('click', () => this.startGame());
        document.getElementById('pause-game')?.addEventListener('click', () => this.pauseGame());
        document.getElementById('resume-game')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('next-round')?.addEventListener('click', () => this.nextRound());
        document.getElementById('end-game')?.addEventListener('click', () => this.endGame());
        document.getElementById('verify-winner')?.addEventListener('click', () => this.verifyWinner());
        document.getElementById('reject-winner')?.addEventListener('click', () => this.rejectWinner());
        document.getElementById('test-firebase')?.addEventListener('click', () => this.testFirebase());
        this.checkFirebaseStatus();
    }

    startRealTimeUpdates() {
        if (!window.firebase) {
            setTimeout(() => this.startRealTimeUpdates(), 1000);
            return;
        }
        const { database, ref, onValue } = window.firebase;
        onValue(ref(database, 'purchases'), (snapshot) => {
            const purchases = snapshot.val();
            this.payments = purchases ? Object.values(purchases) : [];
            this.renderPayments();
            this.updateStats();
            this.updateGameStats();
        });
        onValue(ref(database, 'gameState'), (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.gameActive = gameState.active || false;
                this.currentRound = gameState.currentRound || 1;
                this.isPaused = gameState.paused || false;
                this.updateGameUI();
                this.updateCallerStatus();
            }
        });
        onValue(ref(database, 'prizes'), (snapshot) => {
            const prizes = snapshot.val();
            this.prizes = prizes ? Object.values(prizes) : [];
            this.updatePrizeStats();
            this.renderPrizes();
        });
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            const numbers = snapshot.val() || [];
            const lastNum = numbers[numbers.length - 1];
            const count = numbers.length;
            
            // Actualizar último número
            if (lastNum) {
                const lastNumberElements = [
                    document.getElementById('last-number'),
                    document.getElementById('last-number-display'),
                    document.getElementById('last-number-caller')
                ];
                lastNumberElements.forEach(el => {
                    if (el) el.textContent = lastNum;
                });
            }
            
            // Actualizar contador
            const countElements = [
                document.getElementById('numbers-called-count'),
                document.getElementById('total-called'),
                document.getElementById('total-called-caller')
            ];
            countElements.forEach(el => {
                if (el) el.textContent = count;
            });
            
            // Actualizar disponibles y progreso
            const available = document.getElementById('available-numbers');
            if (available) available.textContent = 75 - count;
            
            const progress = document.getElementById('caller-progress');
            if (progress) progress.textContent = Math.round((count / 75) * 100) + '%';
            
            this.updateCallerStatus();
        });
        onValue(ref(database, 'winners'), (snapshot) => {
            const winners = snapshot.val();
            this.winners = winners ? Object.values(winners) : [];
            this.renderWinners();
        });
    }

    loadPayments() {
        if (!window.firebase) return;
        const { database, ref, get } = window.firebase;
        get(ref(database, 'purchases')).then((snapshot) => {
            const purchases = snapshot.val();
            if (purchases) {
                this.payments = Object.values(purchases);
                this.renderPayments();
                this.updateStats();
            }
        });
    }

    updateStats() {
        const pending = this.payments.filter(p => p.status === 'pending').length;
        const verified = this.payments.filter(p => p.status === 'verified').length;
        const rejected = this.payments.filter(p => p.status === 'rejected').length;
        document.getElementById('pending-count').textContent = pending;
        document.getElementById('verified-count').textContent = verified;
        document.getElementById('rejected-count').textContent = rejected;
        const pendingPaymentsCount = document.getElementById('pending-payments-count');
        if (pendingPaymentsCount) pendingPaymentsCount.textContent = pending;
    }

    updateGameStats() {
        const verified = this.payments.filter(p => p.status === 'verified');
        const ticketsSold = verified.reduce((sum, p) => sum + p.cartones, 0);
        const totalCollected = ticketsSold * 60;
        const totalPrizes = totalCollected * 0.75;
        const roundPrize = this.currentRound === 1 ? totalPrizes * 0.25 : totalPrizes * 0.75;
        document.getElementById('tickets-sold').textContent = ticketsSold;
        document.getElementById('round-prize').textContent = `BsF ${roundPrize.toFixed(2)}`;
        document.getElementById('total-collected').textContent = `BsF ${totalCollected.toFixed(2)}`;
        document.getElementById('total-prizes').textContent = `BsF ${totalPrizes.toFixed(2)}`;
    }

    updateGameUI() {
        // Actualizar todos los badges de estado
        const statusBadges = [
            document.querySelector('#game-status .status-badge'),
            document.getElementById('game-status-badge'),
            document.getElementById('game-status')
        ];
        
        statusBadges.forEach(badge => {
            if (!badge) return;
            if (this.gameActive) {
                badge.textContent = '🟢 Activo';
                badge.className = 'status-badge active';
            } else if (this.isPaused) {
                badge.textContent = '🟡 Pausado';
                badge.className = 'status-badge paused';
            } else {
                badge.textContent = '🔴 Inactivo';
                badge.className = 'status-badge';
            }
        });
        
        // Actualizar rondas
        const roundDisplays = [
            document.getElementById('current-round'),
            document.getElementById('current-round-display')
        ];
        roundDisplays.forEach(display => {
            if (display) display.textContent = this.currentRound;
        });
        
        // Actualizar botones
        const startBtn = document.getElementById('start-game');
        const pauseBtn = document.getElementById('pause-game');
        const resumeBtn = document.getElementById('resume-game');
        const nextBtn = document.getElementById('next-round');
        const endBtn = document.getElementById('end-game');
        if (startBtn) startBtn.style.display = !this.gameActive && !this.isPaused ? 'block' : 'none';
        if (pauseBtn) pauseBtn.style.display = this.gameActive && !this.isPaused ? 'block' : 'none';
        if (resumeBtn) resumeBtn.style.display = this.isPaused ? 'block' : 'none';
        if (nextBtn) nextBtn.style.display = this.gameActive && this.currentRound === 1 ? 'block' : 'none';
        if (endBtn) endBtn.style.display = this.gameActive || this.isPaused ? 'block' : 'none';
    }

    updatePrizeStats() {
        const pending = this.prizes.filter(p => p.status === 'pending').length;
        const paid = this.prizes.filter(p => p.status === 'paid').length;
        document.getElementById('pending-prizes').textContent = pending;
        document.getElementById('paid-prizes').textContent = paid;
    }

    renderPayments() {
        const container = document.getElementById('payments-list');
        if (!container) return;
        const filtered = this.payments.filter(p => p.status === this.currentFilter);
        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><p>No hay pagos ${this.currentFilter === 'pending' ? 'pendientes' : this.currentFilter === 'verified' ? 'verificados' : 'rechazados'}</p></div>`;
            return;
        }
        container.innerHTML = filtered.map((payment, idx) => `
            <div class="payment-card ${payment.status}">
                <div class="payment-header">
                    <span class="payment-ref">#${payment.referencia || payment.ref || 'N/A'}</span>
                    <span class="payment-amount">${payment.monto || payment.amount || 0} BsF</span>
                </div>
                <div class="payment-info">
                    📱 ${payment.telefono || payment.phone}<br>
                    🎫 ${payment.cartones} cartones<br>
                    💳 Ref: ${payment.referencia || payment.ref || 'N/A'}<br>
                    📅 ${new Date(payment.timestamp).toLocaleDateString('es-VE')}
                </div>
                ${payment.status === 'pending' ? `<div class="payment-actions"><button class="payment-btn approve" onclick="window.admin.approvePayment(${idx})">✓ Aprobar</button><button class="payment-btn reject" onclick="window.admin.rejectPayment(${idx})">✗ Rechazar</button></div>` : ''}
            </div>
        `).join('');
    }

    renderPrizes() {
        const container = document.getElementById('prizes-content');
        if (!container) return;
        const filtered = this.prizes.filter(p => p.status === this.currentPrizeTab);
        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💰</div><p>No hay premios ${this.currentPrizeTab === 'pending' ? 'pendientes' : 'pagados'}</p></div>`;
            return;
        }
        container.innerHTML = filtered.map((prize, idx) => `
            <div class="prize-card ${prize.status}">
                <div class="prize-header">
                    <span class="prize-carton">Cartón: ${prize.cartonId}</span>
                    <span class="prize-amount">BsF ${prize.amount}</span>
                </div>
                <div class="prize-info">
                    📱 ${prize.phone}<br>
                    🎯 ${prize.type}<br>
                    📅 ${prize.date} ${prize.time}
                </div>
                ${prize.status === 'pending' ? `<div class="prize-actions"><button class="payment-btn approve" onclick="window.admin.markPrizeAsPaid(${idx})">✓ Marcar Pagado</button></div>` : `<div class="prize-info" style="color: var(--success); font-weight: 700;">✓ Pagado</div>`}
            </div>
        `).join('');
    }

    async approvePayment(idx) {
        if (!window.firebase) return;
        const filtered = this.payments.filter(p => p.status === this.currentFilter);
        const payment = filtered[idx];
        if (!payment) return;
        const { database, ref, set, get } = window.firebase;
        const snapshot = await get(ref(database, 'purchases'));
        const allPurchases = snapshot.val();
        let realId = null;
        for (const id in allPurchases) {
            if (allPurchases[id].timestamp === payment.timestamp && allPurchases[id].telefono === payment.telefono) {
                realId = id;
                break;
            }
        }
        if (!realId) return;
        payment.status = 'verified';
        payment.verifiedDate = new Date().toISOString();
        await set(ref(database, `purchases/${realId}`), payment);
        await this.generateCards(payment.telefono || payment.phone, payment.cartones);
        window.modal.success(`Pago aprobado\n${payment.cartones} cartones asignados`);
    }

    async rejectPayment(idx) {
        if (!window.firebase) return;
        const filtered = this.payments.filter(p => p.status === this.currentFilter);
        const payment = filtered[idx];
        if (!payment) return;
        const { database, ref, set, get } = window.firebase;
        const snapshot = await get(ref(database, 'purchases'));
        const allPurchases = snapshot.val();
        let realId = null;
        for (const id in allPurchases) {
            if (allPurchases[id].timestamp === payment.timestamp && allPurchases[id].telefono === payment.telefono) {
                realId = id;
                break;
            }
        }
        if (!realId) return;
        payment.status = 'rejected';
        payment.rejectedDate = new Date().toISOString();
        await set(ref(database, `purchases/${realId}`), payment);
        window.modal.error('Pago rechazado');
    }

    async generateCards(phone, quantity) {
        if (!window.firebase || !window.generateMultipleCards) return;
        const { database, ref, get, set } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const snapshot = await get(ref(database, `playerCards/${cleanPhone}`));
        let cards = snapshot.val() || [];
        const newCards = window.generateMultipleCards(quantity);
        cards = cards.concat(newCards);
        await set(ref(database, `playerCards/${cleanPhone}`), cards);
    }

    async startGame() {
        if (!window.firebase) return;
        const { database, ref, set } = window.firebase;
        const newPattern = this.generateRandomPattern();
        await set(ref(database, 'gameState'), {
            active: true,
            paused: false,
            currentRound: 1,
            currentPattern: newPattern,
            startTime: Date.now()
        });
        await set(ref(database, 'calledNumbers'), []);
        await set(ref(database, 'bingoAlerts'), null);
        await set(ref(database, 'bingoResult'), null);
        if (this.bingoCaller) {
            this.bingoCaller.start();
        }
        window.modal.success(`Juego iniciado\nPatrón aleatorio generado\nCantado automático activado`);
    }

    generateRandomPattern() {
        const positions = [];
        
        // Solo columnas centrales: I(1), N(2), G(3)
        const centralColumns = [];
        
        for (let row = 0; row < 5; row++) {
            for (let col = 1; col <= 3; col++) { // Solo columnas I, N, G
                if (row === 2 && col === 2) continue; // FREE
                centralColumns.push([row, col]);
            }
        }
        
        // 6-7 posiciones de las columnas centrales
        const numPositions = 6 + Math.floor(Math.random() * 2);
        
        const columnsCopy = [...centralColumns];
        for (let i = 0; i < numPositions && columnsCopy.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * columnsCopy.length);
            positions.push(columnsCopy.splice(randomIndex, 1)[0]);
        }
        
        return {
            name: `Patrón ${Date.now()}`,
            positions: positions
        };
    }

    async pauseGame() {
        if (!window.firebase) return;
        const { database, ref, get, set } = window.firebase;
        const snapshot = await get(ref(database, 'gameState'));
        const gameState = snapshot.val() || {};
        gameState.active = false;
        gameState.paused = true;
        gameState.pauseTimestamp = Date.now();
        await set(ref(database, 'gameState'), gameState);
        if (this.bingoCaller) {
            this.bingoCaller.stop();
        }
        window.modal.info('Juego pausado');
    }

    async resumeGame() {
        if (!window.firebase) return;
        const { database, ref, get, set } = window.firebase;
        const snapshot = await get(ref(database, 'gameState'));
        const gameState = snapshot.val() || {};
        gameState.active = true;
        gameState.paused = false;
        delete gameState.pauseTimestamp;
        await set(ref(database, 'gameState'), gameState);
        if (this.bingoCaller) {
            this.bingoCaller.start();
        }
        window.modal.success('Juego reanudado');
    }

    async nextRound() {
        if (!await window.modal.confirm('¿Avanzar a Ronda 2?')) return;
        if (!window.firebase) return;
        const { database, ref, set, get } = window.firebase;
        
        // Limpiar TODOS los cartones de TODOS los jugadores
        await this.cleanAllCardsForRound2();
        
        await set(ref(database, 'gameState'), {
            active: true,
            currentRound: 2,
            roundTwoReset: true,
            resetTimestamp: Date.now()
        });
        await set(ref(database, 'calledNumbers'), []);
        await set(ref(database, 'bingoAlerts'), null);
        await set(ref(database, 'roundTwoReset'), {
            reset: true,
            timestamp: Date.now()
        });
        if (this.bingoCaller) {
            this.bingoCaller.stop();
            setTimeout(() => this.bingoCaller.start(), 1000);
        }
        window.modal.success('Ronda 2 iniciada');
    }

    async endGame() {
        if (!await window.modal.confirm('¿Finalizar el juego?')) return;
        if (!window.firebase) return;
        const { database, ref, set } = window.firebase;
        await set(ref(database, 'gameState'), {
            active: false,
            gameFinalized: true,
            currentRound: 1,
            endTime: Date.now()
        });
        await set(ref(database, 'calledNumbers'), []);
        await set(ref(database, 'bingoAlerts'), null);
        if (this.bingoCaller) {
            this.bingoCaller.stop();
        }
        window.modal.success('Juego finalizado');
    }

    checkPendingBingo() {
        if (!window.firebase) {
            setTimeout(() => this.checkPendingBingo(), 1000);
            return;
        }
        const { database, ref, onValue } = window.firebase;
        onValue(ref(database, 'bingoAlerts'), (snapshot) => {
            const alerts = snapshot.val();
            if (alerts) {
                this.showBingoPending(alerts);
            } else {
                this.showNoBingo();
            }
        });
    }

    showBingoPending(alerts) {
        document.getElementById('no-bingo-pending').style.display = 'none';
        document.getElementById('bingo-pending').style.display = 'block';
        const alertsArray = Object.entries(alerts);
        const [alertId, bingoData] = alertsArray[0];
        document.getElementById('winner-carton').textContent = bingoData.cartonCode || '-';
        document.getElementById('winner-phone').textContent = bingoData.phone || '-';
        document.getElementById('winner-type').textContent = bingoData.round === 1 ? 'Patrón' : 'Cartón Lleno';
        if (this.bingoValidator) {
            this.validateBingoAlert(alertId, bingoData);
        }
    }

    async validateBingoAlert(alertId, bingoData) {
        if (!window.firebase) return;
        const { database, ref, get } = window.firebase;
        const gameSnap = await get(ref(database, 'gameState'));
        const gameState = gameSnap.val();
        const validation = this.bingoValidator.validate(bingoData, gameState);
        console.log('🔍 Validación automática:', validation);
        this.bingoValidator.visualizeValidation(validation);
    }

    showNoBingo() {
        document.getElementById('no-bingo-pending').style.display = 'block';
        document.getElementById('bingo-pending').style.display = 'none';
    }

    async verifyWinner() {
        if (!window.firebase) return;
        const { database, ref, get, set } = window.firebase;
        const snapshot = await get(ref(database, 'bingoAlerts'));
        const alerts = snapshot.val();
        if (!alerts) return;
        const alertsArray = Object.entries(alerts);
        const [alertId, bingoData] = alertsArray[0];
        const prizeAmount = await this.calculatePrizeAmount();
        const winner = {
            id: Date.now(),
            cartonId: bingoData.cartonCode,
            phone: bingoData.phone,
            type: bingoData.round === 1 ? 'Patrón' : 'Cartón Lleno',
            amount: prizeAmount,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
            round: this.currentRound
        };
        const prize = {
            id: Date.now() + 1,
            cartonId: winner.cartonId,
            phone: winner.phone,
            type: winner.type,
            amount: winner.amount,
            date: winner.date,
            time: winner.time,
            status: 'pending',
            round: this.currentRound
        };
        await set(ref(database, `winners/${winner.id}`), winner);
        await set(ref(database, `prizes/${prize.id}`), prize);
        await set(ref(database, 'bingoResult'), {
            alertId: alertId,
            isValid: true,
            winner: winner,
            timestamp: Date.now()
        });
        await set(ref(database, 'bingoAlerts'), null);
        
        // Si es Ronda 1, avanzar automáticamente a Ronda 2
        if (this.currentRound === 1) {
            setTimeout(async () => {
                await set(ref(database, 'gameState'), {
                    active: true,
                    currentRound: 2,
                    roundTwoReset: true,
                    resetTimestamp: Date.now()
                });
                await set(ref(database, 'calledNumbers'), []);
                await set(ref(database, 'bingoResult'), null);
                await set(ref(database, 'roundTwoReset'), {
                    reset: true,
                    timestamp: Date.now()
                });
                if (this.bingoCaller) {
                    this.bingoCaller.stop();
                    setTimeout(() => this.bingoCaller.start(), 1000);
                }
            }, 3000);
        }
        
        // Si es Ronda 2, FINALIZAR el juego completamente
        if (this.currentRound === 2) {
            setTimeout(async () => {
                // Detener el caller
                if (this.bingoCaller) {
                    this.bingoCaller.stop();
                }
                
                // Finalizar el juego
                await set(ref(database, 'gameState'), {
                    active: false,
                    gameFinalized: true,
                    currentRound: 1,
                    endTime: Date.now()
                });
                
                // Expirar todos los cartones
                await this.expireAllCardsAfterRound2();
            }, 2000);
        }
        
        window.modal.success(`Ganador verificado\nPremio: BsF ${winner.amount}`);
    }

    async rejectWinner() {
        if (!window.firebase) return;
        const { database, ref, set } = window.firebase;
        await set(ref(database, 'bingoResult'), {
            isValid: false,
            timestamp: Date.now()
        });
        await set(ref(database, 'bingoAlerts'), null);
        
        // Limpiar resultado después de 2 segundos
        setTimeout(async () => {
            await set(ref(database, 'bingoResult'), null);
        }, 2000);
        
        window.modal.error('BINGO rechazado');
    }

    async calculatePrizeAmount() {
        const verified = this.payments.filter(p => p.status === 'verified');
        const totalRecaudado = verified.reduce((sum, p) => sum + p.cartones, 0) * 60;
        const totalParaPremios = totalRecaudado * 0.75;
        const roundPrize = this.currentRound === 1 ? totalParaPremios * 0.25 : totalParaPremios * 0.75;
        return Math.round(roundPrize * 100) / 100;
    }

    async markPrizeAsPaid(idx) {
        if (!window.firebase) return;
        const filtered = this.prizes.filter(p => p.status === this.currentPrizeTab);
        const prize = filtered[idx];
        if (!prize) return;
        const { database, ref, set } = window.firebase;
        prize.status = 'paid';
        prize.paidDate = new Date().toISOString();
        await set(ref(database, `prizes/${prize.id}`), prize);
        window.modal.success('Premio marcado como pagado');
    }

    loadPrizes() {
        if (!window.firebase) return;
        const { database, ref, get } = window.firebase;
        get(ref(database, 'prizes')).then((snapshot) => {
            const prizes = snapshot.val();
            if (prizes) {
                this.prizes = Object.values(prizes);
                this.updatePrizeStats();
                this.renderPrizes();
            }
        });
    }

    loadWinners() {
        if (!window.firebase) return;
        const { database, ref, get } = window.firebase;
        get(ref(database, 'winners')).then((snapshot) => {
            const winners = snapshot.val();
            if (winners) {
                this.winners = Object.values(winners);
                this.renderWinners();
            }
        });
    }

    loadUsers() {
        if (!window.firebase) return;
        const { database, ref, get } = window.firebase;
        get(ref(database, 'users')).then((snapshot) => {
            const users = snapshot.val();
            if (users) {
                this.users = Object.values(users);
                const totalUsers = document.getElementById('total-users');
                const activeUsers = document.getElementById('active-users');
                if (totalUsers) totalUsers.textContent = this.users.length;
                if (activeUsers) activeUsers.textContent = this.users.filter(u => u.phone).length;
            }
        });
    }

    renderWinners() {
        const container = document.getElementById('winners-list');
        if (this.winners.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🏆</div><p>No hay ganadores registrados</p></div>`;
            return;
        }
        const sorted = [...this.winners].sort((a, b) => b.id - a.id).slice(0, 20);
        container.innerHTML = sorted.map(winner => `
            <div class="winner-card">
                <div class="winner-header">
                    <span class="winner-carton">Cartón: ${winner.cartonId}</span>
                    <span class="winner-prize">BsF ${winner.amount}</span>
                </div>
                <div class="winner-info">
                    📱 ${winner.phone}<br>
                    🎯 ${winner.type}<br>
                    📅 ${winner.date} ${winner.time}
                </div>
            </div>
        `).join('');
    }

    checkFirebaseStatus() {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('firebase-status-text');
        const connectionStatus = document.getElementById('connection-status');
        const lastSync = document.getElementById('last-sync');
        const activeData = document.getElementById('active-data');

        if (!window.firebase) {
            if (statusDot) {
                statusDot.style.background = '#dc3545';
                statusDot.classList.remove('connected', 'connecting');
            }
            if (statusText) statusText.textContent = 'Desconectado';
            if (connectionStatus) connectionStatus.textContent = '❌ Error';
            setTimeout(() => this.checkFirebaseStatus(), 2000);
            return;
        }

        const { database, ref, onValue } = window.firebase;
        
        if (statusDot) {
            statusDot.style.background = '#00D9A3';
            statusDot.classList.add('connected');
        }
        if (statusText) statusText.textContent = 'Conectado';
        if (connectionStatus) connectionStatus.textContent = '✅ Activo';
        if (lastSync) lastSync.textContent = new Date().toLocaleTimeString('es-VE');

        onValue(ref(database, '.info/connected'), (snapshot) => {
            const connected = snapshot.val();
            if (connected) {
                if (statusDot) {
                    statusDot.style.background = '#00D9A3';
                    statusDot.classList.add('connected');
                    statusDot.classList.remove('connecting');
                }
                if (statusText) statusText.textContent = 'Conectado';
                if (connectionStatus) connectionStatus.textContent = '✅ Activo';
            } else {
                if (statusDot) {
                    statusDot.style.background = '#dc3545';
                    statusDot.classList.remove('connected', 'connecting');
                }
                if (statusText) statusText.textContent = 'Desconectado';
                if (connectionStatus) connectionStatus.textContent = '❌ Sin conexión';
            }
            if (lastSync) lastSync.textContent = new Date().toLocaleTimeString('es-VE');
        });

        this.updateActiveDataCount();
    }

    async updateActiveDataCount() {
        if (!window.firebase) return;
        const { database, ref, get } = window.firebase;
        
        try {
            const snapshot = await get(ref(database, '/'));
            const data = snapshot.val();
            let count = 0;
            if (data) {
                if (data.purchases) count += Object.keys(data.purchases).length;
                if (data.playerCards) count += Object.keys(data.playerCards).length;
                if (data.winners) count += Object.keys(data.winners).length;
            }
            const activeData = document.getElementById('active-data');
            if (activeData) activeData.textContent = count;
        } catch (error) {
            console.error('Error contando datos:', error);
        }
    }

    async testFirebase() {
        if (!window.firebase) {
            window.modal.error('Firebase no inicializado');
            return;
        }

        try {
            const { database, ref, set, get } = window.firebase;
            const testRef = ref(database, 'test');
            await set(testRef, { timestamp: Date.now() });
            const snapshot = await get(testRef);
            if (snapshot.exists()) {
                await set(testRef, null);
                window.modal.success('✅ Conexión exitosa\nFirebase funcionando correctamente');
                this.checkFirebaseStatus();
            }
        } catch (error) {
            window.modal.error('❌ Error de conexión\n' + error.message);
        }
    }

    updateCallerStatus() {
        const callerStatuses = [
            document.getElementById('caller-status'),
            document.getElementById('caller-status-main')
        ];
        
        callerStatuses.forEach(callerStatus => {
            if (!callerStatus) return;

            if (this.gameActive && !this.isPaused) {
                callerStatus.textContent = '🟢 Cantando';
                callerStatus.className = 'status-badge active';
            } else if (this.isPaused) {
                callerStatus.textContent = '🟡 Pausado';
                callerStatus.className = 'status-badge paused';
            } else {
                callerStatus.textContent = '🔴 Detenido';
                callerStatus.className = 'status-badge';
            }
        });
    }

    async cleanAllCardsForRound2() {
        if (!window.firebase) return;
        
        try {
            const { database, ref, get, set } = window.firebase;
            const snapshot = await get(ref(database, 'playerCards'));
            const allCards = snapshot.val();
            
            if (!allCards) return;
            
            for (const phone in allCards) {
                const cards = allCards[phone];
                if (Array.isArray(cards)) {
                    cards.forEach(card => {
                        if (card.status === 'vigente' || card.status === 'en_uso') {
                            card.marked = ['2-2'];
                            card.bingoSent = false;
                        }
                    });
                    await set(ref(database, `playerCards/${phone}`), cards);
                }
            }
            
            console.log('✅ Todos los cartones limpiados para Ronda 2');
        } catch (error) {
            console.error('❌ Error limpiando cartones:', error);
        }
    }

    async expireAllCardsAfterRound2() {
        if (!window.firebase) return;
        
        try {
            const { database, ref, get, set } = window.firebase;
            const snapshot = await get(ref(database, 'playerCards'));
            const allCards = snapshot.val();
            
            if (!allCards) return;
            
            for (const phone in allCards) {
                const cards = allCards[phone];
                if (Array.isArray(cards)) {
                    cards.forEach(card => {
                        if (card.status === 'vigente' || card.status === 'en_uso') {
                            card.status = 'vencido';
                            card.expiredDate = new Date().toISOString();
                            card.expiredReason = 'Juego finalizado - Ronda 2 completada';
                        }
                    });
                    await set(ref(database, `playerCards/${phone}`), cards);
                }
            }
            
            console.log('✅ Todos los cartones expirados después de Ronda 2');
        } catch (error) {
            console.error('❌ Error expirando cartones:', error);
        }
    }

    async searchUser() {
        const phone = document.getElementById('user-phone-search').value;
        if (!phone) {
            window.modal.warning('Ingresa un teléfono');
            return;
        }
        if (!window.firebase) return;
        const { database, ref, get } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        try {
            const userSnap = await get(ref(database, `users/${cleanPhone}`));
            const cardsSnap = await get(ref(database, `playerCards/${cleanPhone}`));
            if (!userSnap.exists()) {
                window.modal.warning('Usuario no encontrado');
                return;
            }
            const user = userSnap.val();
            const cards = cardsSnap.val() || [];
            const profileDiv = document.getElementById('user-profile');
            profileDiv.style.display = 'block';
            profileDiv.innerHTML = `
                <div class="user-profile-card">
                    <div class="user-header">
                        <span class="user-name">${user.name || 'Usuario'}</span>
                        <span style="font-size: 14px; color: var(--text-light);">${user.phone}</span>
                    </div>
                    <div class="user-stats-grid">
                        <div class="user-stat-item">
                            <span class="stat-label">Cartones</span>
                            <span class="stat-value">${cards.length}</span>
                        </div>
                        <div class="user-stat-item">
                            <span class="stat-label">Vigentes</span>
                            <span class="stat-value">${cards.filter(c => c.status === 'vigente').length}</span>
                        </div>
                        <div class="user-stat-item">
                            <span class="stat-label">En Uso</span>
                            <span class="stat-value">${cards.filter(c => c.status === 'en_uso').length}</span>
                        </div>
                        <div class="user-stat-item">
                            <span class="stat-label">Vencidos</span>
                            <span class="stat-value">${cards.filter(c => c.status === 'vencido').length}</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            window.modal.error('Error: ' + error.message);
        }
    }
}

window.filterPayments = function(status) {
    if (!window.admin) return;
    window.admin.currentFilter = status;
    window.admin.renderPayments();
};

window.showPrizeTab = function(tab) {
    if (!window.admin) return;
    window.admin.currentPrizeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    window.admin.renderPrizes();
};

window.searchUser = function() {
    if (!window.admin) return;
    window.admin.searchUser();
};

window.filterWinners = function() {
    if (!window.admin) return;
    const dateFilter = document.getElementById('winner-date-filter')?.value;
    const phoneFilter = document.getElementById('winner-phone-filter')?.value;
    let filtered = [...window.admin.winners];
    if (dateFilter) {
        filtered = filtered.filter(w => w.date === dateFilter);
    }
    if (phoneFilter) {
        filtered = filtered.filter(w => w.phone && w.phone.includes(phoneFilter));
    }
    const container = document.getElementById('winners-list');
    if (!container) return;
    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No se encontraron ganadores</p></div>`;
        return;
    }
    container.innerHTML = filtered.map(winner => `
        <div class="winner-card">
            <div class="winner-header">
                <span class="winner-carton">Cartón: ${winner.cartonId}</span>
                <span class="winner-prize">Bs
F ${winner.amount}</span>
            </div>
            <div class="winner-info">
                📱 ${winner.phone}<br>
                🎯 ${winner.type}<br>
                📅 ${winner.date} ${winner.time}
            </div>
        </div>
    `).join('');
};

// Inicializar admin cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.admin = new DesktopAdmin();
    });
} else {
    window.admin = new DesktopAdmin();
}
