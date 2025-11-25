// Funciones de Mantenimiento para Admin
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
        window.modal.success('Cartones reseteados');
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
    if (!await window.modal.confirm('¿Limpiar datos del juego actual?')) return;
    if (!window.firebase) {
        window.modal.error('Firebase no disponible');
        return;
    }
    try {
        const { database, ref, set } = window.firebase;
        await set(ref(database, 'gameState'), {
            active: false,
            paused: false,
            currentRound: 1
        });
        await set(ref(database, 'calledNumbers'), []);
        await set(ref(database, 'bingoAlerts'), null);
        await set(ref(database, 'bingoResult'), null);
        window.modal.success('Datos del juego limpiados');
    } catch (error) {
        window.modal.error('Error: ' + error.message);
    }
};

window.resetTotalSystem = async function() {
    const confirmed = await window.modal.confirm('⚠️ RESET TOTAL DEL SISTEMA\n\n¿Estás seguro? Esto eliminará TODO.');
    if (!confirmed) return;
    if (!window.firebase) {
        window.modal.error('Firebase no disponible');
        return;
    }
    try {
        const { database, ref, set } = window.firebase;
        await Promise.all([
            set(ref(database, 'gameState'), null),
            set(ref(database, 'calledNumbers'), null),
            set(ref(database, 'playerCards'), null),
            set(ref(database, 'purchases'), null),
            set(ref(database, 'winners'), null),
            set(ref(database, 'prizes'), null),
            set(ref(database, 'users'), null),
            set(ref(database, 'bingoAlerts'), null),
            set(ref(database, 'bingoResult'), null)
        ]);
        window.modal.success('RESET TOTAL COMPLETADO');
        setTimeout(() => location.reload(), 2000);
    } catch (error) {
        window.modal.error('Error: ' + error.message);
    }
};
