// Lógica del juego de Bingo

document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const bingoBoard = document.getElementById('tabla-bingo');
    const newGameButton = document.getElementById('btn-nuevo-juego');
    const callNumberButton = document.getElementById('btn-cantar-numero');
    const currentNumberDisplay = document.getElementById('numero-actual');
    const previousNumbersContainer = document.getElementById('numeros-previos');

    // Estado del juego
    let availableNumbers = [];
    let calledNumbers = new Set();
    let gameInProgress = false;

    const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'];
    const ranges = {
        'B': { min: 1, max: 15 }, 'I': { min: 16, max: 30 }, 'N': { min: 31, max: 45 },
        'G': { min: 46, max: 60 }, 'O': { min: 61, max: 75 }
    };

    // --- INICIALIZACIÓN ---

    function initializeGame() {
        gameInProgress = true;
        calledNumbers.clear();
        availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1);
        currentNumberDisplay.textContent = '--';
        previousNumbersContainer.innerHTML = '';
        callNumberButton.disabled = false;
        createBingoCard();
    }

    function createBingoCard() {
        bingoBoard.innerHTML = '';
        const cardNumbers = new Map();

        BINGO_LETTERS.forEach(letter => {
            const headerCell = document.createElement('div');
            headerCell.classList.add('bingo-cell', 'header');
            headerCell.textContent = letter;
            bingoBoard.appendChild(headerCell);
            cardNumbers.set(letter, new Set());
        });

        const numberCells = [];
        for (let i = 0; i < 5; i++) {
            BINGO_LETTERS.forEach(letter => {
                const cell = document.createElement('div');
                cell.classList.add('bingo-cell');
                if (letter === 'N' && i === 2) {
                    cell.textContent = 'FREE';
                    cell.classList.add('free', 'marked');
                    cell.dataset.number = 'FREE';
                } else {
                    const { min, max } = ranges[letter];
                    const number = generateUniqueRandomNumber(min, max, cardNumbers.get(letter));
                    cell.textContent = number;
                    cell.dataset.number = number;
                    cell.addEventListener('click', () => toggleMark(cell));
                }
                numberCells.push(cell);
            });
        }
        numberCells.forEach(cell => bingoBoard.appendChild(cell));
    }

    function generateUniqueRandomNumber(min, max, existingNumbers) {
        let num;
        do {
            num = Math.floor(Math.random() * (max - min + 1)) + min;
        } while (existingNumbers.has(num));
        existingNumbers.add(num);
        return num;
    }

    // --- MECÁNICA DEL JUEGO ---

    function callNumber() {
        if (!gameInProgress || availableNumbers.length === 0) {
            endGame(false); // No more numbers
            return;
        }

        const randomIndex = Math.floor(Math.random() * availableNumbers.length);
        const number = availableNumbers.splice(randomIndex, 1)[0];
        calledNumbers.add(number);

        currentNumberDisplay.textContent = number;
        updatePreviousNumbers(number);
        markNumberOnCard(number);

        if (checkForBingo()) {
            endGame(true); // Bingo found
        }
    }

    function updatePreviousNumbers(number) {
        const prevNumberDiv = document.createElement('div');
        prevNumberDiv.classList.add('numero-previo');
        prevNumberDiv.textContent = number;
        previousNumbersContainer.prepend(prevNumberDiv);
    }

    function markNumberOnCard(number) {
        const cell = bingoBoard.querySelector(`[data-number="${number}"]`);
        if (cell) {
            cell.classList.add('marked');
        }
    }

    function toggleMark(cell) {
        if (!cell.classList.contains('free') && gameInProgress) {
            cell.classList.toggle('marked');
            if (checkForBingo()) {
                endGame(true);
            }
        }
    }

    // --- VERIFICACIÓN DE BINGO ---

    function checkForBingo() {
        const cells = Array.from(bingoBoard.querySelectorAll('.bingo-cell:not(.header)'));
        const isMarked = (index) => cells[index].classList.contains('marked');

        const winPatterns = [
            // Rows
            [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
            // Columns
            [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
            // Diagonals
            [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
        ];

        for (const pattern of winPatterns) {
            if (pattern.every(isMarked)) {
                return true;
            }
        }
        return false;
    }

    function endGame(isWinner) {
        gameInProgress = false;
        callNumberButton.disabled = true;
        if (isWinner) {
            setTimeout(() => alert('¡BINGO! Has ganado.'), 100); // Timeout to allow UI to update
        } else {
            currentNumberDisplay.textContent = 'FIN';
        }
    }

    // --- EVENT LISTENERS ---

    newGameButton.addEventListener('click', initializeGame);
    callNumberButton.addEventListener('click', callNumber);

    // --- INICIO ---
    initializeGame();
});
