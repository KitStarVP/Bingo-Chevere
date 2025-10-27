// Generador de Cartones de Bingo
function generateCardsForPlayer(phone, quantity) {
    if (!window.firebase) {
        console.error('❌ Firebase no disponible - no se pueden generar cartones');
        return;
    }
    
    const { database, ref, get, set } = window.firebase;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Generar cartones
    const newCards = [];
    for (let i = 0; i < quantity; i++) {
        const card = generateBingoCard();
        card.phone = phone;
        card.purchaseDate = new Date().toISOString();
        card.status = 'vigente';
        card.gameId = null; // Se asignará cuando inicie el juego
        newCards.push(card);
    }
    
    // Obtener cartones existentes y agregar los nuevos
    get(ref(database, `playerCards/${cleanPhone}`)).then((snapshot) => {
        let existingCards = snapshot.val() || [];
        const allCards = [...existingCards, ...newCards];
        
        return set(ref(database, `playerCards/${cleanPhone}`), allCards);
    }).then(() => {
        console.log(`✅ ${quantity} cartones generados para ${phone}`);
    }).catch(error => {
        console.error('❌ Error generando cartones:', error);
    });
}

function generateBingoCard() {
    const card = {
        id: Date.now() + Math.random(),
        code: generateCardCode(),
        numbers: generateCardNumbers(),
        marked: [],
        autoMode: true,
        createdAt: Date.now()
    };
    
    return card;
}

function generateCardCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    
    let code = '';
    // 2 letras
    for (let i = 0; i < 2; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    // 3 números
    for (let i = 0; i < 3; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    return code;
}

function generateCardNumbers() {
    const numbers = [[], [], [], [], []];
    
    // Rangos para cada columna: B(1-15), I(16-30), N(31-45), G(46-60), O(61-75)
    const ranges = [
        [1, 15],   // B
        [16, 30],  // I
        [31, 45],  // N
        [46, 60],  // G
        [61, 75]   // O
    ];
    
    for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col];
        const availableNumbers = [];
        
        // Crear lista de números disponibles para esta columna
        for (let i = min; i <= max; i++) {
            availableNumbers.push(i);
        }
        
        // Seleccionar 5 números únicos para esta columna
        for (let row = 0; row < 5; row++) {
            if (row === 2 && col === 2) {
                // Centro es FREE
                numbers[row][col] = 0;
            } else {
                const randomIndex = Math.floor(Math.random() * availableNumbers.length);
                numbers[row][col] = availableNumbers.splice(randomIndex, 1)[0];
            }
        }
    }
    
    return numbers;
}

// Función para actualizar compra en Firebase
function updatePurchaseInFirebase(purchase) {
    if (!window.firebase) return;
    
    const { database, ref, get, set } = window.firebase;
    
    get(ref(database, 'purchases')).then((snapshot) => {
        let allPurchases = snapshot.val() || {};
        
        // Buscar y actualizar la compra
        Object.keys(allPurchases).forEach(key => {
            if (allPurchases[key].id === purchase.id) {
                allPurchases[key] = purchase;
            }
        });
        
        return set(ref(database, 'purchases'), allPurchases);
    }).then(() => {
        console.log('✅ Compra actualizada en Firebase');
    }).catch(error => {
        console.error('❌ Error actualizando compra:', error);
    });
}

// Función para cargar compras desde Firebase
function loadPurchasesFromFirebase() {
    if (!window.firebase) {
        console.error('❌ Firebase no disponible - no se pueden cargar compras');
        return;
    }
    
    const { database, ref, onValue } = window.firebase;
    
    onValue(ref(database, 'purchases'), (snapshot) => {
        const purchases = snapshot.val();
        if (purchases) {
            allPayments = Object.values(purchases).sort((a, b) => new Date(b.date) - new Date(a.date));
            console.log('✅ Compras cargadas desde Firebase:', allPayments.length);
        } else {
            allPayments = [];
        }
        updatePaymentStats();
    }, (error) => {
        console.error('❌ Error cargando compras:', error);
        allPayments = [];
        updatePaymentStats();
    });
}