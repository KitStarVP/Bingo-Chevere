// Generador de Cartones de Bingo
function generateBingoCard() {
    const card = [];
    const ranges = [
        [1, 15],   // B
        [16, 30],  // I
        [31, 45],  // N
        [46, 60],  // G
        [61, 75]   // O
    ];

    for (let col = 0; col < 5; col++) {
        const column = [];
        const [min, max] = ranges[col];
        const used = new Set();

        for (let row = 0; row < 5; row++) {
            if (row === 2 && col === 2) {
                column.push(0); // FREE
            } else {
                let num;
                do {
                    num = Math.floor(Math.random() * (max - min + 1)) + min;
                } while (used.has(num));
                used.add(num);
                column.push(num);
            }
        }
        card.push(column);
    }

    // Transponer para formato [fila][columna]
    const transposed = [];
    for (let row = 0; row < 5; row++) {
        transposed.push(card.map(col => col[row]));
    }

    return transposed;
}

// Generar múltiples cartones
function generateMultipleCards(quantity) {
    const cards = [];
    for (let i = 0; i < quantity; i++) {
        const shortId = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
        cards.push({
            id: shortId,
            code: `C${shortId}`,
            numbers: generateBingoCard(),
            status: 'vigente',
            createdDate: new Date().toISOString(),
            marked: ['2-2'] // Centro gratis
        });
    }
    return cards;
}

// Exportar funciones globalmente
window.generateBingoCard = generateBingoCard;
window.generateMultipleCards = generateMultipleCards;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateBingoCard, generateMultipleCards };
}
