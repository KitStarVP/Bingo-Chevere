// Nueva Sala de Juego con Audio y Diseño Uniforme
class SalaJuego {
    constructor() {
        this.calledNumbers = [];
        this.playerCards = [];
        this.gameActive = false;
        this.currentRound = 1;
        this.currentPrize = 450;
        this.currentPattern = 'Línea Horizontal';
        this.gameState = null;
        this.audioEnabled = true;
        
        this.init();
    }

    init() {
        console.log('Inicializando nueva sala de juego...');
        this.generateNumbersGrid();
        this.generateFloatingNumbersGrid();
        this.loadGameState();
        this.loadPlayerCards();
        this.updateGameStatus();
        this.startStateMonitoring();
        this.setupAudio();
        this.floatingHistoryOpen = false;
    }

    setupAudio() {
        // Verificar si el navegador soporta síntesis de voz
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            console.log('Audio habilitado');
        } else {
            console.log('Audio no disponible en este navegador');
            this.audioEnabled = false;
        }
    }

    speakNumber(number) {
        if (!this.audioEnabled || !this.speechSynthesis) return;

        const bingoLetter = this.getBingoLetter(number);
        const text = `${bingoLetter} ${number}, repito, ${bingoLetter} ${number}`;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        
        this.speechSynthesis.speak(utterance);
    }

    loadGameState() {
        const gameState = localStorage.getItem('bingoGameState');
        if (gameState) {
            this.gameState = JSON.parse(gameState);
            this.gameActive = this.gameState.gameActive || false;
            this.currentRound = this.gameState.currentRound || 1;
            this.currentPrize = this.gameState.roundPrize || 450;
            this.currentPattern = this.gameState.currentPattern?.name || 'Línea Horizontal';
            
            const savedNumbers = this.gameState.calledNumbers || [];
            this.calledNumbers = savedNumbers.map(item => 
                typeof item === 'object' ? item.number : item
            );
            
            if (this.gameActive && this.gameState.gameStartTime) {
                this.syncWithLiveGame(savedNumbers);
            }
        }
        
        if (this.playerCards.length === 0) {
            this.playerCards = this.getSavedCards();
            this.renderPlayerCards();
            this.updateCardsCount();
        }
    }

    syncWithLiveGame(savedNumbers) {
        savedNumbers.forEach(numberData => {
            const number = typeof numberData === 'object' ? numberData.number : numberData;
            if (!this.calledNumbers.includes(number)) {
                this.calledNumbers.push(number);
            }
            this.markNumberAsCalled(number);
        });
        
        if (this.calledNumbers.length > 0) {
            const lastNumber = this.calledNumbers[this.calledNumbers.length - 1];
            this.updateLastCalled(lastNumber);
        }
        
        this.calledNumbers.forEach(num => this.autoMarkCards(num));
    }

    startStateMonitoring() {
        setInterval(() => {
            const newGameState = localStorage.getItem('bingoGameState');
            if (newGameState) {
                const parsed = JSON.parse(newGameState);
                
                if (parsed.gameActive !== this.gameActive) {
                    this.gameActive = parsed.gameActive;
                    this.currentRound = parsed.currentRound;
                    this.currentPrize = parsed.roundPrize;
                    this.currentPattern = parsed.currentPattern?.name || 'Línea Horizontal';
                    
                    if (this.gameActive) {
                        this.markCardsAsInUse();
                        this.showMessage('¡El juego ha comenzado!');
                    }
                    
                    this.updateGameStatus();
                }
                
                if (parsed.calledNumbers) {
                    const savedNumbers = parsed.calledNumbers.map(item => 
                        typeof item === 'object' ? item.number : item
                    );
                    
                    const newNumbers = savedNumbers.filter(num => !this.calledNumbers.includes(num));
                    
                    newNumbers.forEach((num, index) => {
                        const isLatestNumber = index === newNumbers.length - 1;
                        this.callNumber(num, isLatestNumber);
                    });
                }
            }
        }, 1000);
    }

    generateNumbersGrid() {
        const grid = document.getElementById('numbers-grid');
        grid.innerHTML = '';
        
        const bingoSections = [
            { letter: 'B', start: 1, end: 15 },
            { letter: 'I', start: 16, end: 30 },
            { letter: 'N', start: 31, end: 45 },
            { letter: 'G', start: 46, end: 60 },
            { letter: 'O', start: 61, end: 75 }
        ];
        
        bingoSections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'bingo-section';
            
            const numbersDiv = document.createElement('div');
            numbersDiv.className = 'bingo-section-numbers';
            
            for (let i = section.start; i <= section.end; i++) {
                const cell = document.createElement('div');
                cell.className = 'number-cell';
                cell.textContent = i;
                cell.id = `number-${i}`;
                numbersDiv.appendChild(cell);
            }
            
            sectionDiv.appendChild(numbersDiv);
            grid.appendChild(sectionDiv);
        });
    }

    loadPlayerCards() {
        const allCards = this.getSavedCards();
        this.playerCards = allCards.filter(card => 
            card.status === 'vigente' || card.status === 'en_uso'
        );
        
        if (this.playerCards.length === 0) {
            this.showWaitingState();
            return;
        }
        
        if (this.gameActive) {
            this.markCardsAsInUse();
        }

        this.renderPlayerCards();
        this.updateCardsCount();
    }

    getSavedCards() {
        const savedCards = localStorage.getItem('playerCards');
        if (savedCards) {
            return JSON.parse(savedCards);
        }
        
        // Si no hay cartones guardados, devolver array vacío
        return [];
    }

    generateCardNumbers() {
        const numbers = [];
        const ranges = [
            [1, 15],   // B
            [16, 30],  // I
            [31, 45],  // N
            [46, 60],  // G
            [61, 75]   // O
        ];
        
        for (let col = 0; col < 5; col++) {
            const columnNumbers = [];
            const [min, max] = ranges[col];
            
            for (let row = 0; row < 5; row++) {
                if (row === 2 && col === 2) {
                    columnNumbers.push(0); // FREE
                } else {
                    let num;
                    do {
                        num = Math.floor(Math.random() * (max - min + 1)) + min;
                    } while (columnNumbers.includes(num));
                    columnNumbers.push(num);
                }
            }
            
            for (let row = 0; row < 5; row++) {
                if (!numbers[row]) numbers[row] = [];
                numbers[row][col] = columnNumbers[row];
            }
        }
        
        return numbers;
    }

    renderPlayerCards() {
        const container = document.getElementById('bingo-cards');
        if (!container) return;
        
        container.innerHTML = '';

        this.playerCards.forEach(card => {
            const cardElement = this.createCardElement(card);
            container.appendChild(cardElement);
        });
    }

    createCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card-item';
        
        if (card.autoMode === undefined) {
            card.autoMode = true;
        }

        cardDiv.innerHTML = `
            <div class="mini-header">${card.id} - ${card.code}</div>
            <div class="bingo-header">
                <div class="bingo-letter">B</div>
                <div class="bingo-letter">I</div>
                <div class="bingo-letter">N</div>
                <div class="bingo-letter">G</div>
                <div class="bingo-letter">O</div>
            </div>
            <div class="mini-grid" data-card-id="${card.id}">
                ${this.generateCardGrid(card)}
            </div>
            <div class="mini-controls">
                <div class="mini-toggle ${card.autoMode ? 'active' : ''}" onclick="salaJuego.toggleAutoMode(${card.id})">
                    ${card.autoMode ? 'A' : 'M'}
                </div>
                <button class="mini-bingo" onclick="salaJuego.claimCardBingo(${card.id})" ${!(card.hasBingo || card.hasLine) ? 'disabled' : ''}>
                    BINGO
                </button>
            </div>
        `;

        return cardDiv;
    }

    generateCardGrid(card) {
        let html = '';
        
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const number = card.numbers[row][col];
                const isFree = number === 0;
                const isMarked = card.marked.includes(`${row}-${col}`) || isFree;
                
                html += `
                    <div class="mini-cell ${isMarked ? 'marked' : ''} ${isFree ? 'free' : ''}" 
                         data-card-id="${card.id}" 
                         data-row="${row}" 
                         data-col="${col}"
                         data-number="${number}"
                         onclick="salaJuego.toggleCell(${card.id}, ${row}, ${col})">
                        ${isFree ? 'F' : number}
                    </div>
                `;
            }
        }
        
        return html;
    }

    toggleCell(cardId, row, col) {
        const card = this.playerCards.find(c => c.id === cardId);
        if (!card) return;

        if (card.autoMode) {
            this.showMessage('Desactiva el modo automático para marcar manualmente');
            return;
        }

        const number = card.numbers[row][col];
        if (number === 0) return;

        if (!this.calledNumbers.includes(number)) {
            this.showMessage('Este número aún no ha sido cantado');
            return;
        }

        const cellKey = `${row}-${col}`;
        const cellIndex = card.marked.indexOf(cellKey);
        
        if (cellIndex > -1) {
            card.marked.splice(cellIndex, 1);
        } else {
            card.marked.push(cellKey);
        }

        this.checkCardStatus(card);
        this.renderPlayerCards();
    }

    toggleAutoMode(cardId) {
        const card = this.playerCards.find(c => c.id === cardId);
        if (!card) return;
        
        card.autoMode = !card.autoMode;
        
        if (card.autoMode) {
            this.autoMarkCard(card);
        }
        
        const toggleButton = document.querySelector(`[onclick="salaJuego.toggleAutoMode(${cardId})"]`);
        if (toggleButton) {
            if (card.autoMode) {
                toggleButton.classList.add('active');
                toggleButton.textContent = 'A';
            } else {
                toggleButton.classList.remove('active');
                toggleButton.textContent = 'M';
            }
        }
        
        this.saveCards();
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
        this.checkCardStatus(card);
    }

    claimCardBingo(cardId) {
        const card = this.playerCards.find(c => c.id === cardId);
        if (card && (card.hasBingo || card.hasLine)) {
            const message = card.hasBingo ? 
                `¡Felicidades! Has ganado BINGO con el cartón #${cardId}` :
                `¡Felicidades! Has completado el patrón con el cartón #${cardId}`;
            this.showMessage(message);
        }
    }

    checkCardStatus(card) {
        card.hasLine = this.checkForLine(card);
        card.hasBingo = this.checkForBingo(card);
    }

    checkForLine(card) {
        // Verificar filas
        for (let row = 0; row < 5; row++) {
            let lineComplete = true;
            for (let col = 0; col < 5; col++) {
                const cellKey = `${row}-${col}`;
                const isFree = card.numbers[row][col] === 0;
                if (!isFree && !card.marked.includes(cellKey)) {
                    lineComplete = false;
                    break;
                }
            }
            if (lineComplete) return true;
        }

        // Verificar columnas
        for (let col = 0; col < 5; col++) {
            let lineComplete = true;
            for (let row = 0; row < 5; row++) {
                const cellKey = `${row}-${col}`;
                const isFree = card.numbers[row][col] === 0;
                if (!isFree && !card.marked.includes(cellKey)) {
                    lineComplete = false;
                    break;
                }
            }
            if (lineComplete) return true;
        }

        // Verificar diagonales
        let diagonal1 = true, diagonal2 = true;
        for (let i = 0; i < 5; i++) {
            const cellKey1 = `${i}-${i}`;
            const cellKey2 = `${i}-${4-i}`;
            const isFree1 = card.numbers[i][i] === 0;
            const isFree2 = card.numbers[i][4-i] === 0;
            
            if (!isFree1 && !card.marked.includes(cellKey1)) diagonal1 = false;
            if (!isFree2 && !card.marked.includes(cellKey2)) diagonal2 = false;
        }

        return diagonal1 || diagonal2;
    }

    checkForBingo(card) {
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

    callNumber(number, showAnimation = true) {
        if (this.calledNumbers.includes(number)) return;
        
        this.calledNumbers.push(number);
        this.markNumberAsCalled(number);
        this.updateLastCalled(number);
        
        this.autoMarkCards(number);
        
        if (showAnimation) {
            const bingoLetter = this.getBingoLetter(number);
            const formattedNumber = `${bingoLetter}${number}`;
            this.showNumberAnimation(formattedNumber);
            this.speakNumber(number);
        }
    }

    markNumberAsCalled(number) {
        const numberCell = document.getElementById(`number-${number}`);
        if (numberCell) {
            numberCell.classList.add('called');
        }
        
        // Marcar en historial flotante también
        const floatingCell = document.getElementById(`floating-number-${number}`);
        if (floatingCell) {
            floatingCell.classList.add('called');
        }
    }

    updateLastCalled(number) {
        const bingoLetter = this.getBingoLetter(number);
        const formattedNumber = `${bingoLetter}${number}`;
        
        // Actualizar en sección principal
        const lastCalledEl = document.getElementById('last-called');
        if (lastCalledEl) {
            lastCalledEl.textContent = formattedNumber;
        }
        
        // Actualizar en header fijo
        const lastCalledFixed = document.getElementById('last-called-fixed');
        if (lastCalledFixed) {
            lastCalledFixed.textContent = formattedNumber;
        }
        
        // Actualizar botón flotante
        const floatingNumber = document.getElementById('floating-number');
        if (floatingNumber) {
            floatingNumber.textContent = formattedNumber;
            floatingNumber.classList.add('pulse');
            setTimeout(() => floatingNumber.classList.remove('pulse'), 1500);
        }
        
        // Actualizar historial flotante
        this.updateFloatingHistory();
    }

    getBingoLetter(number) {
        if (number >= 1 && number <= 15) return 'B';
        if (number >= 16 && number <= 30) return 'I';
        if (number >= 31 && number <= 45) return 'N';
        if (number >= 46 && number <= 60) return 'G';
        if (number >= 61 && number <= 75) return 'O';
        return '';
    }

    showNumberAnimation(formattedNumber) {
        const ball = document.createElement('div');
        ball.className = 'bingo-ball';
        ball.innerHTML = `
            <div class="ball-inner">
                <span class="ball-letter">${formattedNumber.charAt(0)}</span>
                <span class="ball-number">${formattedNumber.slice(1)}</span>
            </div>
        `;
        
        document.body.appendChild(ball);
        
        setTimeout(() => {
            ball.remove();
        }, 3000);
    }

    autoMarkCards(number) {
        this.playerCards.forEach(card => {
            if (card.autoMode) {
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
                this.checkCardStatus(card);
            }
        });
        
        this.renderPlayerCards();
    }

    markCardsAsInUse() {
        this.playerCards.forEach(card => {
            if (card.status === 'vigente') {
                card.status = 'en_uso';
            }
        });
        this.saveCards();
    }

    saveCards() {
        const allCards = this.getSavedCards();
        this.playerCards.forEach(activeCard => {
            const cardIndex = allCards.findIndex(c => c.id === activeCard.id);
            if (cardIndex !== -1) {
                allCards[cardIndex] = activeCard;
            }
        });
        localStorage.setItem('playerCards', JSON.stringify(allCards));
    }

    showWaitingState() {
        const container = document.getElementById('bingo-cards');
        container.innerHTML = `
            <div class="waiting-state" style="grid-column: 1 / -1; text-align: center; padding: 2rem 1rem;">
                <h3 style="color: #3498db; margin-bottom: 1rem; font-size: 1.1rem;">No tienes cartones vigentes</h3>
                <p style="margin-bottom: 1.5rem; color: #666; font-size: 0.9rem;">Necesitas comprar cartones para participar en el bingo</p>
                <a href="comprar-cartones.html" style="display: inline-block; padding: 1rem 2rem; text-decoration: none; background: #3498db; color: white; border-radius: 8px; font-weight: 600; font-size: 0.9rem;">Comprar Cartones</a>
            </div>
        `;
        
        document.getElementById('cards-count').textContent = '0 cartones vigentes';
    }

    updateCardsCount() {
        const count = this.playerCards.length;
        document.getElementById('cards-count').textContent = `${count} cartón${count !== 1 ? 'es' : ''}`;
    }

    updateGameStatus() {
        // Actualizar header principal
        document.getElementById('current-round').textContent = `${this.currentRound} de 2`;
        document.getElementById('current-prize').textContent = `BsF ${this.currentPrize}`;
        document.getElementById('current-pattern').textContent = this.currentPattern;
        
        // Actualizar header fijo
        const roundFixed = document.getElementById('round-fixed');
        const prizeFixed = document.getElementById('prize-fixed');
        if (roundFixed) roundFixed.textContent = this.currentRound;
        if (prizeFixed) prizeFixed.textContent = this.currentPrize;
    }

    showMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    toggleHistory() {
        // Scroll suave hacia la sección de números
        const numbersSection = document.querySelector('.numbers-section');
        if (numbersSection) {
            numbersSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    generateFloatingNumbersGrid() {
        const grid = document.getElementById('floating-numbers-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        for (let i = 1; i <= 75; i++) {
            const cell = document.createElement('div');
            cell.className = 'history-number';
            cell.textContent = i;
            cell.id = `floating-number-${i}`;
            grid.appendChild(cell);
        }
    }

    updateFloatingHistory() {
        // Actualizar grid de números
        this.calledNumbers.forEach(num => {
            const cell = document.getElementById(`floating-number-${num}`);
            if (cell) {
                cell.classList.add('called');
            }
        });
        
        // Actualizar lista de últimos números
        const recentList = document.getElementById('recent-numbers-list');
        if (recentList) {
            const recent = this.calledNumbers.slice(-10).reverse();
            recentList.innerHTML = recent.map(num => {
                const letter = this.getBingoLetter(num);
                return `<div class="recent-item">${letter}${num}</div>`;
            }).join('');
        }
    }

    toggleFloatingHistory() {
        const panel = document.getElementById('history-panel');
        if (panel) {
            if (this.floatingHistoryOpen) {
                panel.classList.remove('show');
                this.floatingHistoryOpen = false;
            } else {
                panel.classList.add('show');
                this.floatingHistoryOpen = true;
                this.updateFloatingHistory();
            }
        }
    }

    closeFloatingHistory() {
        const panel = document.getElementById('history-panel');
        if (panel) {
            panel.classList.remove('show');
            this.floatingHistoryOpen = false;
        }
    }
}

// Inicializar la sala de juego
let salaJuego;
document.addEventListener('DOMContentLoaded', () => {
    salaJuego = new SalaJuego();
});