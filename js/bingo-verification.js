// Sistema de Verificación de BINGO

// Función para verificar BINGO desde la sala de juego
function verifyBingoCard(cardData) {
    if (!window.firebase) {
        console.error('❌ Firebase no disponible para verificación');
        return false;
    }
    
    const { database, ref, get } = window.firebase;
    
    return get(ref(database, 'calledNumbers')).then(snapshot => {
        const calledNumbers = snapshot.val() || [];
        
        // Verificar si el cartón realmente tiene BINGO
        if (cardData.type === 'PATRON') {
            return verifyPattern(cardData, calledNumbers);
        } else {
            return verifyFullCard(cardData, calledNumbers);
        }
    });
}

// Verificar patrón en ronda 1
function verifyPattern(cardData, calledNumbers) {
    // Aquí se verificaría el patrón específico
    // Por ahora retornamos true para testing
    return true;
}

// Verificar cartón lleno en ronda 2
function verifyFullCard(cardData, calledNumbers) {
    // Verificar que todos los números del cartón hayan sido cantados
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            const number = cardData.numbers[row][col];
            if (number !== 0 && !calledNumbers.includes(number)) {
                return false;
            }
        }
    }
    return true;
}

// Función para limpiar verificaciones pendientes
function clearPendingVerifications() {
    if (!window.firebase) return;
    
    const { database, ref, set } = window.firebase;
    
    set(ref(database, 'pendingBingoVerification'), null)
        .then(() => console.log('✅ Verificaciones pendientes limpiadas'))
        .catch(error => console.error('❌ Error limpiando verificaciones:', error));
}

// Función para enviar resultado de verificación
function sendVerificationResult(result) {
    if (!window.firebase) return;
    
    const { database, ref, set } = window.firebase;
    
    set(ref(database, 'bingoVerificationResult'), result)
        .then(() => {
            console.log('✅ Resultado de verificación enviado');
            // Limpiar después de 5 segundos
            setTimeout(() => {
                set(ref(database, 'bingoVerificationResult'), null);
            }, 5000);
        })
        .catch(error => console.error('❌ Error enviando resultado:', error));
}