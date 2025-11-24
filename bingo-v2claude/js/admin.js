// Panel Admin Móvil
class MobileAdmin {
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
        this.callerActive = false;
        this.calledNumbers = [];
        this.init();
    }

    init() {
        this.loadPayments();
        this.loadPrizes();
        this.loadWinners();
        this.loadUsers();
        this.setupListeners();
        this.startRealTimeUpdates();
        this.checkPendingBingo();
    }

    setupListeners() {
        document.getElementById('start-game')?.addEventListener('click', () => this.startGame());
        document.getElementById('pause-game')?.addEventListener('click', () => this.pauseGame());
        document.getElementById('resume-game')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('next-round')?.addEventListener('click', () => this.nextRound());
        document.getElementById('end-game')?.addEventListener('click', () => this.endGame());
        document.getElementById('verify-winner')?.addEventListener('click', () => this.verifyWinner());
        document.getElementById('reject-winner')?.addEventListener('click', () => this.rejectWinner());
        document.getElementById('start-caller')?.addEventListener('click', () => this.startCaller());
        document.getElementById('stop-caller')?.addEventListener('click', () => this.stopCaller());
        document.getElementById('call-manual')?.addEventListener('click', () => this.callManual());
    }

    startRealTimeUpdates() {
        if (!window.firebase) {
            setTimeout(() => this.startRealTimeUpdates(), 1000);
            return;
        }

        const { database, ref, onValue } = window.firebase;
        
        // Escuchar cambios en compras
        onValue(ref(database, 'purchases'), (snapshot) => {
            const purchases = snapshot.val();
            if (purchases) {
                this.payments = Object.values(purchases);
                this.renderPayments();
                this.updateStats();
                this.updateGameStats();
            } else {
                this.payments = [];
                this.renderPayments();
                this.updateStats();
            }
        });

        // Escuchar estado del juego
        onValue(ref(database, 'gameState'), (snapshot) => {
            const gameState = snapshot.val();
            if (gameState) {
                this.gameActive = gameState.gameActive || false;
                this.currentRound = gameState.currentRound || 1;
                this.isPaused = gameState.isPaused || false;
                this.updateGameUI();
            }
        });

        // Escuchar premios
        onValue(ref(database, 'prizes'), (snapshot) => {
            const prizes = snapshot.val();
            if (prizes) {
                this.prizes = Object.values(prizes);
                this.updatePrizeStats();
                this.renderPrizes();
            } else {
                this.prizes = [];
                this.updatePrizeStats();
                this.renderPrizes();
            }
        });

        // Escuchar números cantados
        onValue(ref(database, 'calledNumbers'), (snapshot) => {
            const numbers = snapshot.val();
            if (numbers && Array.isArray(numbers)) {
                this.calledNumbers = numbers;
                const lastNum = numbers[numbers.length - 1];
                if (lastNum) {
                    document.getElementById('last-number').textContent = lastNum;
                }
            }
        });

        // Escuchar ganadores
        onValue(ref(database, 'winners'), (snapshot) => {
            const winners = snapshot.val();
            if (winners) {
                this.winners = Object.values(winners);
                this.renderWinners();
            } else {
                this.winners = [];
                this.renderWinners();
            }
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
        const statusBadge = document.querySelector('#game-status .status-badge');
        const roundDisplay = document.getElementById('current-round');
        
        if (!statusBadge || !roundDisplay) return;
        
        if (this.gameActive) {
            statusBadge.textContent = '🟢 Activo';
            statusBadge.className = 'status-badge active';
        } else if (this.isPaused) {
            statusBadge.textContent = '🟡 Pausado';
            statusBadge.className = 'status-badge paused';
        } else {
            statusBadge.textContent = '🔴 Inactivo';
            statusBadge.className = 'status-badge';
        }

        roundDisplay.textContent = this.currentRound;

        // Mostrar/ocultar botones
        const startBtn = document.getElementById('start-game');
        const pauseBtn = document.getElementById('pause-game');
        const resumeBtn = document.getElementById('resume-game');
        const nextBtn = document.getElementById('next-round');
        const endBtn = document.getElementById('end-game');
        
        if (startBtn) startBtn.style.display = !this.gameActive && !this.isPaused ? 'flex' : 'none';
        if (pauseBtn) pauseBtn.style.display = this.gameActive && !this.isPaused ? 'flex' : 'none';
        if (resumeBtn) resumeBtn.style.display = this.isPaused ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = this.gameActive && this.currentRound === 1 ? 'flex' : 'none';
        if (endBtn) endBtn.style.display = this.gameActive || this.isPaused ? 'flex' : 'none';
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
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✅</div>
                    <p>No hay pagos ${this.currentFilter === 'pending' ? 'pendientes' : this.currentFilter === 'verified' ? 'verificados' : 'rechazados'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map((payment, idx) => `
            <div class="payment-card ${payment.status}">
                <div class="payment-header">
                    <span class="payment-ref">Ref: ${payment.referencia || payment.ref || 'N/A'}</span>
                    <span class="payment-amount">${payment.monto || payment.amount || 0} BsF</span>
                </div>
                <div class="payment-info">
                    📱 ${payment.telefono || payment.phone}<br>
                    🎫 ${payment.cartones} cartones<br>
                    📅 ${new Date(payment.timestamp).toLocaleDateString('es-VE')}
                </div>
                ${payment.status === 'pending' ? `
                    <div class="payment-actions">
                        <button class="payment-btn approve" onclick="window.admin.approvePayment(${idx})">
                            ✓ Aprobar
                        </button>
                        <button class="payment-btn reject" onclick="window.admin.rejectPayment(${idx})">
                            ✗ Rechazar
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderPrizes() {
        const container = document.getElementById('prizes-content');
        if (!container) return;
        
        const filtered = this.prizes.filter(p => p.status === this.currentPrizeTab);

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💰</div>
                    <p>No hay premios ${this.currentPrizeTab === 'pending' ? 'pendientes' : 'pagados'}</p>
                </div>
            `;
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
                ${prize.status === 'pending' ? `
                    <div class="prize-actions">
                        <button class="payment-btn approve" onclick="window.admin.markPrizeAsPaid(${idx})">
                            ✓ Marcar Pagado
                        </button>
                    </div>
                ` : `
                    <div class="prize-info" style="color: var(--success); font-weight: 700;">
                        ✓ Pagado
                    </div>
                `}
            </div>
        `).join('');
    }

    async approvePayment(idx) {
        if (!window.firebase) return;

        const filtered = this.payments.filter(p => p.status === this.currentFilter);
        const payment = filtered[idx];
        if (!payment) return;

        const { database, ref, set, get } = window.firebase;
        
        // Buscar el ID real en Firebase
        const snapshot = await get(ref(database, 'purchases'));
        const allPurchases = snapshot.val();
        let realId = null;
        
        for (const id in allPurchases) {
            if (allPurchases[id].timestamp === payment.timestamp && 
                allPurchases[id].telefono === payment.telefono) {
                realId = id;
                break;
            }
        }
        
        if (!realId) return;
        
        payment.status = 'verified';
        payment.verifiedDate = new Date().toISOString();

        await set(ref(database, `purchases/${realId}`), payment);
        
        // Generar cartones
        await this.generateCards(payment.telefono || payment.phone, payment.cartones);
        
        window.modal.success(`Pago aprobado\n${payment.cartones} cartones asignados a ${payment.telefono || payment.phone}`);
    }

    async rejectPayment(idx) {
        if (!window.firebase) return;

        const filtered = this.payments.filter(p => p.status === this.currentFilter);
        const payment = filtered[idx];
        if (!payment) return;

        const { database, ref, set, get } = window.firebase;
        
        // Buscar el ID real en Firebase
        const snapshot = await get(ref(database, 'purchases'));
        const allPurchases = snapshot.val();
        let realId = null;
        
        for (const id in allPurchases) {
            if (allPurchases[id].timestamp === payment.timestamp && 
                allPurchases[id].telefono === payment.telefono) {
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
        
        const defaultPattern = {
            name: 'Cruz',
            positions: [[0,2], [1,2], [2,0], [2,1], [2,2], [2,3], [2,4], [3,2], [4,2]]
        };
        
        await set(ref(database, 'gameState'), {
            gameActive: true,
            isPaused: false,
            currentRound: 1,
            currentPattern: defaultPattern,
            startTime: Date.now()
        });

        await set(ref(database, 'calledNumbers'), []);

        window.modal.success('Juego iniciado - Ronda 1: Patrón Cruz');
    }

    async pauseGame() {
        if (!window.firebase) return;

        const { database, ref, get, set } = window.firebase;
        const snapshot = await get(ref(database, 'gameState'));
        const gameState = snapshot.val() || {};

        gameState.gameActive = false;
        gameState.isPaused = true;
        gameState.pauseTimestamp = Date.now();

        await set(ref(database, 'gameState'), gameState);
        window.modal.info('Juego pausado');
    }

    async resumeGame() {
        if (!window.firebase) return;

        const { database, ref, get, set } = window.firebase;
        const snapshot = await get(ref(database, 'gameState'));
        const gameState = snapshot.val() || {};

        gameState.gameActive = true;
        gameState.isPaused = false;
        delete gameState.pauseTimestamp;

        await set(ref(database, 'gameState'), gameState);
        window.modal.success('Juego reanudado');
    }

    async nextRound() {
        if (!await window.modal.confirm('¿Avanzar a Ronda 2?')) return;

        if (!window.firebase) return;

        const { database, ref, set } = window.firebase;
        
        await set(ref(database, 'gameState'), {
            gameActive: true,
            currentRound: 2,
            roundTwoReset: true,
            resetTimestamp: Date.now()
        });

        await set(ref(database, 'calledNumbers'), []);
        await set(ref(database, 'roundTwoReset'), {
            reset: true,
            timestamp: Date.now()
        });

        window.modal.success('Ronda 2 iniciada');
    }

    async endGame() {
        if (!await window.modal.confirm('¿Finalizar el juego?')) return;

        if (!window.firebase) return;

        const { database, ref, set } = window.firebase;
        
        await set(ref(database, 'gameState'), {
            gameActive: false,
            gameFinalized: true,
            bothRoundsCompleted: true,
            expireCards: true,
            currentRound: 1,
            endTime: Date.now()
        });

        await set(ref(database, 'calledNumbers'), []);

        window.modal.success('Juego finalizado');
    }

    checkPendingBingo() {
        if (!window.firebase) {
            setTimeout(() => this.checkPendingBingo(), 1000);
            return;
        }

        const { database, ref, onValue } = window.firebase;
        onValue(ref(database, 'pendingBingoVerification'), (snapshot) => {
            const pending = snapshot.val();
            if (pending) {
                this.showBingoPending(pending);
            } else {
                this.showNoBingo();
            }
        });
    }

    showBingoPending(bingoData) {
        document.getElementById('no-bingo-pending').style.display = 'none';
        document.getElementById('bingo-pending').style.display = 'block';
        
        document.getElementById('winner-carton').textContent = bingoData.cartonId || '-';
        document.getElementById('winner-phone').textContent = bingoData.phone || '-';
        document.getElementById('winner-type').textContent = bingoData.typeText || bingoData.type || '-';
    }

    showNoBingo() {
        document.getElementById('no-bingo-pending').style.display = 'block';
        document.getElementById('bingo-pending').style.display = 'none';
    }

    async verifyWinner() {
        if (!window.firebase) return;

        const { database, ref, get, set } = window.firebase;
        const snapshot = await get(ref(database, 'pendingBingoVerification'));
        const bingoData = snapshot.val();

        if (!bingoData) return;

        const prizeAmount = await this.calculatePrizeAmount();

        const winner = {
            id: Date.now(),
            cartonId: bingoData.cartonId,
            phone: bingoData.phone,
            type: bingoData.typeText || bingoData.type,
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
        await set(ref(database, 'bingoVerificationResult'), {
            isCorrect: true,
            isWinner: true,
            typeText: winner.type,
            prize: winner.amount
        });
        await set(ref(database, 'pendingBingoVerification'), null);
        await set(ref(database, 'globalBingoAlert'), null);

        window.modal.success(`Ganador verificado\nPremio: BsF ${winner.amount}`);
    }

    async rejectWinner() {
        if (!window.firebase) return;

        const { database, ref, set } = window.firebase;
        
        await set(ref(database, 'bingoVerificationResult'), {
            isCorrect: false,
            isWinner: false
        });
        await set(ref(database, 'pendingBingoVerification'), null);
        await set(ref(database, 'globalBingoAlert'), null);

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
                document.getElementById('total-users').textContent = this.users.length;
                document.getElementById('active-users').textContent = this.users.filter(u => u.phone).length;
            }
        });
    }

    renderWinners() {
        const container = document.getElementById('winners-list');
        
        if (this.winners.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🏆</div>
                    <p>No hay ganadores registrados</p>
                </div>
            `;
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

    async startCaller() {
        if (!window.ultraCaller) {
            window.modal.error('UltraCaller no disponible');
            return;
        }

        window.ultraCaller.start();
        this.callerActive = true;
        document.getElementById('caller-status').textContent = '🟢 Activo';
        document.getElementById('caller-status').className = 'status-badge active';
        document.getElementById('start-caller').style.display = 'none';
        document.getElementById('stop-caller').style.display = 'block';
    }

    async stopCaller() {
        if (!window.ultraCaller) return;

        window.ultraCaller.stop();
        this.callerActive = false;
        document.getElementById('caller-status').textContent = '🔴 Detenido';
        document.getElementById('caller-status').className = 'status-badge';
        document.getElementById('start-caller').style.display = 'block';
        document.getElementById('stop-caller').style.display = 'none';
    }

    async callManual() {
        if (!window.ultraCaller) {
            window.modal.error('UltraCaller no disponible');
            return;
        }

        window.ultraCaller.callNextNumber();
    }
}

// Funciones globales
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
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p>No se encontraron ganadores</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(winner => `
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
};

window.resetAllCards = async function() {
    if (!await window.modal.confirm('¿Resetear todos los cartones? Esto limpiará todas las marcas pero mantendrá los cartones activos.')) return;
    
    if (!window.firebase) {
        window.modal.error('Firebase no disponible');
        return;
    }
    
    try {
        const { database, ref, get, set } = window.firebase;
        
        const snapshot = await get(ref(database, 'playerCards'));
        const allCards = snapshot.val();
        
        if (!allCards) {
            window.modal.warning('No hay cartones para resetear');
            return;
        }
        
        for (const phone in allCards) {
            const cards = allCards[phone];
            if (Array.isArray(cards)) {
                cards.forEach(card => {
                    card.marked = ['2-2'];
                    card.resetTimestamp = Date.now();
                });
                await set(ref(database, `playerCards/${phone}`), cards);
            }
        }
        
        window.modal.success('Cartones reseteados - marcas limpiadas');
    } catch (error) {
        window.modal.error('Error: ' + error.message);
    }
};

window.expireAllCards = async function() {
    if (!await window.modal.confirm('¿Expirar todos los cartones activos?')) return;
    
    if (!window.firebase) {
        window.modal.error('Firebase no disponible');
        return;
    }
    
    try {
        const { database, ref, get, set } = window.firebase;
        
        const snapshot = await get(ref(database, 'playerCards'));
        const allCards = snapshot.val();
        
        if (!allCards) {
            window.modal.warning('No hay cartones para expirar');
            return;
        }
        
        for (const phone in allCards) {
            const cards = allCards[phone];
            if (Array.isArray(cards)) {
                cards.forEach(card => {
                    if (card.status === 'en_uso' || card.status === 'vigente') {
                        card.status = 'vencido';
                        card.expiredDate = new Date().toISOString();
                    }
                });
                await set(ref(database, `playerCards/${phone}`), cards);
            }
        }
        
        window.modal.success('Cartones expirados');
    } catch (error) {
        window.modal.error('Error: ' + error.message);
    }
};

window.clearGameData = async function() {
    if (!await window.modal.confirm('¿Limpiar datos del juego actual? Esto solo limpia el estado del juego, no los cartones ni compras.')) return;
    
    if (!window.firebase) {
        window.modal.error('Firebase no disponible');
        return;
    }
    
    try {
        const { database, ref, set } = window.firebase;
        
        await set(ref(database, 'gameState'), {
            gameActive: false,
            isPaused: false,
            currentRound: 1
        });
        await set(ref(database, 'calledNumbers'), []);
        await set(ref(database, 'pendingBingoVerification'), null);
        await set(ref(database, 'globalBingoAlert'), null);
        await set(ref(database, 'bingoVerificationResult'), null);
        
        window.modal.success('Datos del juego limpiados');
    } catch (error) {
        window.modal.error('Error: ' + error.message);
    }
};

window.resetTotalSystem = async function() {
    const confirmed = await window.modal.confirm(
        '⚠️ RESET TOTAL DEL SISTEMA\n\n¿Estás seguro? Esto eliminará:\n• Todos los usuarios y cartones\n• Todas las compras y pagos\n• Todos los ganadores y premios\n• Estado del juego completo\n• Historial completo\n\nEsta acción NO se puede deshacer.',
        '🗑️ RESET TOTAL',
        '⚠️'
    );
    
    if (!confirmed) return;
    
    if (!window.firebase) {
        window.modal.error('Firebase no disponible');
        return;
    }
    
    try {
        const { database, ref, set } = window.firebase;
        
        // Limpiar TODOS los datos de Firebase
        await Promise.all([
            set(ref(database, 'gameState'), null),
            set(ref(database, 'calledNumbers'), null),
            set(ref(database, 'playerCards'), null),
            set(ref(database, 'purchases'), null),
            set(ref(database, 'winners'), null),
            set(ref(database, 'prizes'), null),
            set(ref(database, 'users'), null),
            set(ref(database, 'pendingBingoVerification'), null),
            set(ref(database, 'globalBingoAlert'), null),
            set(ref(database, 'bingoVerificationResult'), null),
            set(ref(database, 'roundTwoReset'), null)
        ]);
        
        // Limpiar localStorage (mantener solo configuración)
        const keysToKeep = [];
        const allKeys = Object.keys(localStorage);
        allKeys.forEach(key => {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        });
        
        window.modal.success('✅ RESET TOTAL COMPLETADO\n\nTodos los datos han sido eliminados. La página se recargará...');
        
        setTimeout(() => {
            location.reload();
        }, 2000);
    } catch (error) {
        window.modal.error('Error durante el reset: ' + error.message);
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const admin = new MobileAdmin();
        window.admin = admin;
        
        // Inicializar UltraCaller si existe
        setTimeout(() => {
            if (typeof UltraCaller !== 'undefined' && window.firebase) {
                window.ultraCaller = new UltraCaller(window.firebase.database);
            }
        }, 1000);
        
        // Inicializar monitor de Firebase
        initFirebaseMonitor();
    }, 500);
});

// Monitor de Firebase
let firebaseMonitor = {
    connected: false,
    lastSync: null,
    activeData: 0,
    
    init() {
        this.startMonitoring();
        this.updateUI();
    },
    
    startMonitoring() {
        if (!window.firebase) return;
        
        const { database, ref, onValue } = window.firebase;
        
        onValue(ref(database, '.info/connected'), (snapshot) => {
            this.connected = snapshot.val();
            this.lastSync = new Date();
            this.updateUI();
        });
        
        setInterval(() => this.checkActiveData(), 5000);
    },
    
    async checkActiveData() {
        if (!window.firebase) return;
        
        try {
            const { database, ref, get } = window.firebase;
            const gameState = await get(ref(database, 'gameState'));
            const calledNumbers = await get(ref(database, 'calledNumbers'));
            const purchases = await get(ref(database, 'purchases'));
            
            this.activeData = 0;
            if (gameState.exists()) this.activeData++;
            if (calledNumbers.exists()) this.activeData++;
            if (purchases.exists()) this.activeData++;
            
            this.updateUI();
        } catch (error) {
            this.connected = false;
            this.updateUI();
        }
    },
    
    updateUI() {
        const indicator = document.getElementById('firebase-indicator');
        const statusText = document.getElementById('firebase-status-text');
        const dot = indicator?.querySelector('.status-dot');
        const connectionStatus = document.getElementById('connection-status');
        const lastSync = document.getElementById('last-sync');
        const activeData = document.getElementById('active-data');
        
        if (this.connected) {
            dot?.classList.add('connected');
            dot?.classList.remove('connecting');
            if (statusText) statusText.textContent = 'Conectado';
        } else {
            dot?.classList.remove('connected');
            dot?.classList.add('connecting');
            if (statusText) statusText.textContent = 'Desconectado';
        }
        
        if (connectionStatus) connectionStatus.textContent = this.connected ? 'Activa' : 'Perdida';
        if (lastSync) lastSync.textContent = this.lastSync ? this.lastSync.toLocaleTimeString() : '--';
        if (activeData) activeData.textContent = `${this.activeData} nodos`;
    }
};

function initFirebaseMonitor() {
    setTimeout(() => {
        if (window.firebase) {
            firebaseMonitor.init();
            
            const testBtn = document.getElementById('test-firebase');
            if (testBtn) {
                testBtn.addEventListener('click', async () => {
                    try {
                        const { database, ref, set, get } = window.firebase;
                        const testData = { test: Date.now() };
                        await set(ref(database, 'connectionTest'), testData);
                        const result = await get(ref(database, 'connectionTest'));
                        
                        if (result.exists()) {
                            await set(ref(database, 'connectionTest'), null);
                            window.modal.success('Conexión exitosa');
                        } else {
                            window.modal.error('Error de lectura');
                        }
                    } catch (error) {
                        window.modal.error('Error: ' + error.message);
                    }
                });
            }
        }
    }, 1000);
}
