// Funciones críticas del admin para comunicación con sala de juego

// Función para expirar cartones del juego actual
function expireCardsFromCurrentGame() {
    if (!window.firebase) return;
    
    const { database, ref, get, set } = window.firebase;
    
    get(ref(database, 'playerCards')).then((snapshot) => {
        const allPlayerCards = snapshot.val();
        if (!allPlayerCards) return;
        
        Object.keys(allPlayerCards).forEach(phone => {
            const playerCards = allPlayerCards[phone];
            if (Array.isArray(playerCards)) {
                let hasChanges = false;
                playerCards.forEach(card => {
                    if (card.status === 'en_uso' || card.status === 'vigente') {
                        card.status = 'vencido';
                        card.expiredDate = new Date().toISOString();
                        card.expiredReason = 'Partida completada';
                        hasChanges = true;
                    }
                });
                if (hasChanges) {
                    set(ref(database, `playerCards/${phone}`), playerCards);
                }
            }
        });
    });
}

// Función para activar cartones de próxima partida
function activateNextGameCards() {
    if (!window.firebase) return;
    
    const { database, ref, get, set } = window.firebase;
    
    get(ref(database, 'playerCards')).then((snapshot) => {
        const allPlayerCards = snapshot.val();
        if (!allPlayerCards) return;
        
        Object.keys(allPlayerCards).forEach(phone => {
            const playerCards = allPlayerCards[phone];
            if (Array.isArray(playerCards)) {
                let hasChanges = false;
                playerCards.forEach(card => {
                    if (card.status === 'esperando') {
                        card.status = 'vigente';
                        card.activatedDate = new Date().toISOString();
                        hasChanges = true;
                    }
                });
                if (hasChanges) {
                    set(ref(database, `playerCards/${phone}`), playerCards);
                }
            }
        });
    });
    
    console.log('✅ Cartones de próximo juego activados');
}

// Función para pausar juego en Firebase
function pauseGameInFirebase(reason) {
    if (!window.firebase) return;
    
    const { database, ref, set, get } = window.firebase;
    
    get(ref(database, 'gameState')).then(snapshot => {
        const currentState = snapshot.val() || {};
        const gameState = {
            ...currentState,
            gameActive: false,
            isPaused: true,
            pauseReason: reason,
            pauseTimestamp: Date.now(),
            timestamp: Date.now()
        };
        
        return set(ref(database, 'gameState'), gameState);
    }).then(() => {
        console.log('✅ Juego pausado en Firebase');
    }).catch(error => {
        console.error('❌ Error pausando juego:', error);
    });
}

// Función para guardar estado del juego
function saveGameStateToFirebase() {
    if (!window.firebase) return;
    
    const { database, ref, set, get } = window.firebase;
    
    get(ref(database, 'gameState')).then(snapshot => {
        const currentState = snapshot.val() || {};
        const gameState = {
            ...currentState,
            timestamp: Date.now(),
            adminControlled: true
        };
        
        return set(ref(database, 'gameState'), gameState);
    }).then(() => {
        console.log('✅ Estado guardado en Firebase');
    }).catch(error => {
        console.error('❌ Error guardando estado:', error);
    });
}