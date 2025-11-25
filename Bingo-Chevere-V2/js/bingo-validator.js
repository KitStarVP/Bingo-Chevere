// Sistema de Validación de Ganadores - Profesional
class BingoValidator {
    constructor() {
        this.currentPattern = null;
    }

    setPattern(pattern) {
        this.currentPattern = pattern;
    }

    validate(alert, gameState) {
        const { carton, marked, round, numbersUsed } = alert;

        // 1. Verificar marcas inválidas
        const invalidMarks = this.checkInvalidMarks(carton, marked, numbersUsed);

        // 2. Verificar patrón o cartón lleno
        let patternValid = false;
        let missingPositions = [];

        if (round === 1) {
            const patternCheck = this.checkPattern(marked, gameState.pattern);
            patternValid = patternCheck.isValid;
            missingPositions = patternCheck.missing;
        } else {
            const fullCardCheck = this.checkFullCard(marked);
            patternValid = fullCardCheck.isValid;
            missingPositions = fullCardCheck.missing;
        }

        const isValid = invalidMarks.length === 0 && patternValid;

        return {
            isValid: isValid,
            invalidMarks: invalidMarks,
            patternValid: patternValid,
            missingPositions: missingPositions,
            details: this.generateDetails(carton, marked, numbersUsed, round)
        };
    }

    checkInvalidMarks(carton, marked, numbersUsed) {
        const invalid = [];

        marked.forEach(pos => {
            const [row, col] = pos.split('-').map(Number);
            const number = carton[row][col];

            // FREE siempre válido
            if (number === 0) return;

            // Verificar si el número fue cantado
            if (!numbersUsed.includes(number)) {
                invalid.push({
                    position: pos,
                    number: number,
                    reason: 'Número no cantado'
                });
            }
        });

        return invalid;
    }

    checkPattern(marked, pattern) {
        if (!pattern || !pattern.positions) {
            return { isValid: false, missing: [] };
        }

        const missing = [];
        const markedSet = new Set(marked);

        // FREE siempre debe estar marcado
        if (!markedSet.has('2-2')) {
            missing.push('2-2');
        }

        // Verificar cada posición del patrón
        pattern.positions.forEach(([row, col]) => {
            const key = `${row}-${col}`;
            if (!markedSet.has(key)) {
                missing.push(key);
            }
        });

        return {
            isValid: missing.length === 0,
            missing: missing
        };
    }

    checkFullCard(marked) {
        const missing = [];
        const markedSet = new Set(marked);

        // Verificar todas las posiciones (5x5 = 25)
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const key = `${row}-${col}`;
                if (!markedSet.has(key)) {
                    missing.push(key);
                }
            }
        }

        return {
            isValid: missing.length === 0,
            missing: missing
        };
    }

    generateDetails(carton, marked, numbersUsed, round) {
        const markedSet = new Set(marked);
        const grid = [];

        for (let row = 0; row < 5; row++) {
            const rowData = [];
            for (let col = 0; col < 5; col++) {
                const number = carton[row][col];
                const key = `${row}-${col}`;
                const isMarked = markedSet.has(key);
                const isFree = number === 0;
                const wasCalled = numbersUsed.includes(number);

                rowData.push({
                    number: number,
                    marked: isMarked,
                    free: isFree,
                    called: wasCalled,
                    valid: isFree || (isMarked && wasCalled) || !isMarked
                });
            }
            grid.push(rowData);
        }

        return {
            grid: grid,
            totalMarked: marked.length,
            totalCalled: numbersUsed.length,
            round: round
        };
    }

    visualizeValidation(validation) {
        console.log('🔍 VALIDACIÓN DE BINGO:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (validation.isValid) {
            console.log('✅ BINGO VÁLIDO');
        } else {
            console.log('❌ BINGO INVÁLIDO');
        }

        if (validation.invalidMarks.length > 0) {
            console.log('\n⚠️ Marcas inválidas:');
            validation.invalidMarks.forEach(mark => {
                console.log(`  - Posición ${mark.position}: Número ${mark.number} (${mark.reason})`);
            });
        }

        if (validation.missingPositions.length > 0) {
            console.log('\n⚠️ Posiciones faltantes:');
            validation.missingPositions.forEach(pos => {
                console.log(`  - ${pos}`);
            });
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
}

// Exportar globalmente
window.BingoValidator = BingoValidator;
