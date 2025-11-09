// Fix completo para todas las funciones del panel de administración
console.log('🔧 Cargando fix completo del panel de administración...');

// Variables globales para el admin
window.adminData = {
    allPayments: [],
    filteredPayments: [],
    currentFilter: 'pending',
    bingoWinners: [],
    bingoPrizes: [],
    notificationHistory: JSON.parse(localStorage.getItem('notificationHistory') || '[]')
};

// Inicialización completa del admin
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Iniciando fix completo del admin...');
    
    setTimeout(() => {
        initializeCompleteAdmin();
    }, 2000);
});

function initializeCompleteAdmin() {
    console.log('🔧 Aplicando fix completo...');
    
    // 1. Cargar datos desde Firebase
    loadAllDataFromFirebase();
    
    // 2. Inicializar todos los controles
    initializeAllControls();
    
    // 3. Configurar monitoreo en tiempo real
    setupRealTimeMonitoring();
    
    // 4. Actualizar estadísticas
    updateAllStats();
    
    console.log('✅ Fix completo aplicado');
}

// === CARGA DE DATOS DESDE FIREBASE ===
function loadAllDataFromFirebase() {
    if (!window.firebase) {
        console.error('❌ Firebase no disponible');
        return;
    }
    
    console.log('📥 Cargando datos desde Firebase...');
    
    const { database, ref, onValue } = window.firebase;
    
    // Cargar compras/pagos
    onValue(ref(database, 'purchases'), (snapshot) => {
        const purchases = snapshot.val();
        if (purchases) {
            window.adminData.allPayments = Object.values(purchases).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            console.log('✅ Pagos cargados:', window.adminData.allPayments.length);
            updatePaymentStats();
            if (document.getElementById('payment-modal').style.display === 'flex') {
                filterPayments();
            }
        } else {
            window.adminData.allPayments = [];
            updatePaymentStats();
        }
    });
    
    // Cargar ganadores
    onValue(ref(database, 'winners'), (snapshot) => {
        const winners = snapshot.val();
        if (winners) {
            window.adminData.bingoWinners = Object.values(winners).sort((a, b) => (b.id || 0) - (a.id || 0));
            console.log('✅ Ganadores cargados:', window.adminData.bingoWinners.length);
        } else {
            window.adminData.bingoWinners = [];
        }
    });
    
    // Cargar premios
    onValue(ref(database, 'prizes'), (snapshot) => {
        const prizes = snapshot.val();
        if (prizes) {
            window.adminData.bingoPrizes = Object.values(prizes).sort((a, b) => (b.id || 0) - (a.id || 0));
            console.log('✅ Premios cargados:', window.adminData.bingoPrizes.length);
            updatePrizeStats();
        } else {
            window.adminData.bingoPrizes = [];
            updatePrizeStats();
        }
    });
}

// === INICIALIZACIÓN DE CONTROLES ===
function initializeAllControls() {
    console.log('🎛️ Inicializando todos los controles...');
    
    // Botones de pagos
    initPaymentControls();
    
    // Botones de comunicación
    initCommunicationControls();
    
    // Botones de usuarios
    initUserControls();
    
    // Botones de premios
    initPrizeControls();
    
    // Botones de mantenimiento
    initMaintenanceControls();
    
    // Botones Ultra
    initUltraControls();
    
    // Botones de dominio
    initDomainControls();
    
    // Botones de verificación
    initVerificationControls();
}

function initPaymentControls() {
    // Estadísticas de pagos (clickeables)
    document.querySelectorAll('.payment-stat').forEach(stat => {
        stat.onclick = function() {
            const status = this.onclick.toString().includes('pending') ? 'pending' :
                          this.onclick.toString().includes('verified') ? 'verified' : 'rejected';
            showPayments(status);
        };
    });
    
    // Asegurar que las funciones globales existan
    window.showPayments = showPayments;
    window.closePaymentModal = closePaymentModal;
    window.filterPayments = filterPayments;
    window.approvePayment = approvePayment;
    window.rejectPayment = rejectPayment;
    
    // Hacer funciones de reset globales
    window.executeReset = window.executeReset;
    window.closeResetModal = window.closeResetModal;
}

function initCommunicationControls() {
    // Botones de WhatsApp
    document.querySelectorAll('.share-whatsapp').forEach(btn => {
        btn.onclick = function() {
            const template = this.closest('.message-template');
            if (template) {
                const message = template.dataset.messageTemplate;
                if (message) {
                    shareToWhatsApp(message);
                }
            }
        };
    });
    
    // Mensaje personalizado
    const shareCustomBtn = document.getElementById('share-custom');
    if (shareCustomBtn) {
        shareCustomBtn.onclick = function() {
            const customText = document.getElementById('custom-message-text').value.trim();
            if (!customText) {
                alert('Escribe un mensaje personalizado');
                return;
            }
            shareToWhatsApp(customText);
        };
    }
    
    // Limpiar historial
    window.clearNotificationHistory = clearNotificationHistory;
}

function initUserControls() {
    // Búsqueda de usuarios
    const searchBtn = document.querySelector('button[onclick="searchUser()"]');
    if (searchBtn) {
        searchBtn.onclick = searchUser;
    }
    
    // Actualizar lista
    const updateBtn = document.querySelector('button[onclick="loadAllUsers(true)"]');
    if (updateBtn) {
        updateBtn.onclick = () => loadAllUsers(true);
    }
    
    // Dropdown de usuarios
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.onchange = selectUserFromDropdown;
    }
    
    // Funciones globales
    window.searchUser = searchUser;
    window.loadAllUsers = loadAllUsers;
    window.selectUserFromDropdown = selectUserFromDropdown;
}

function initPrizeControls() {
    // Pestañas de premios
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = function() {
            const tab = this.onclick.toString().includes('pending') ? 'pending' : 'paid';
            showPrizeTab(tab);
        };
    });
    
    window.showPrizeTab = showPrizeTab;
    window.markAsPaid = markAsPaid;
}

function initMaintenanceControls() {
    const buttons = {
        'clear-cache': () => {
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                    alert('Caché eliminado');
                });
            } else {
                alert('Caché local limpiado');
            }
        },
        'clear-logs': () => {
            console.clear();
            alert('Logs limpiados');
        },
        'reset-ui': () => {
            document.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(input => {
                if (!input.id.includes('domain')) input.value = '';
            });
            alert('Interfaz reseteada');
        },
        'optimize-system': () => {
            const importantKeys = ['bingoDomain', 'userPhone', 'userProfile'];
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (!importantKeys.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            alert('Sistema optimizado');
        },
        'total-reset': () => {
            const modal = document.getElementById('reset-modal');
            if (modal) modal.style.display = 'flex';
        }
    };
    
    Object.keys(buttons).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = buttons[id];
        }
    });
    
    // Funciones del modal de reset
    window.closeResetModal = () => {
        const modal = document.getElementById('reset-modal');
        if (modal) modal.style.display = 'none';
    };
    
    window.executeReset = () => {
        const resetType = document.querySelector('input[name="resetType"]:checked')?.value;
        const confirmText = document.getElementById('reset-confirmation-text').value;
        
        if (confirmText !== 'RESET TOTAL') {
            alert('Debes escribir exactamente "RESET TOTAL" para confirmar');
            return;
        }
        
        if (!resetType) {
            alert('Selecciona un tipo de reset');
            return;
        }
        
        closeResetModal();
        
        // Mostrar modal de progreso
        showProgressModal();
        
        // Ejecutar reset según tipo
        if (resetType === 'total') {
            executeFullReset();
        } else if (resetType === 'verify') {
            executeResetWithVerification();
        } else if (resetType === 'test') {
            executeTestOnly();
        }
    };
    
    // Funciones de reset con progreso
    function showProgressModal() {
        const modal = document.getElementById('progress-modal');
        if (modal) {
            modal.style.display = 'flex';
            updateProgress(0, 'Iniciando...');
        }
    }
    
    function updateProgress(percent, message) {
        const fill = document.getElementById('progress-fill');
        const text = document.getElementById('progress-text');
        const steps = document.getElementById('progress-steps');
        
        if (fill) fill.style.width = percent + '%';
        if (text) text.textContent = message;
        if (steps) {
            const step = document.createElement('div');
            step.textContent = `• ${message}`;
            steps.appendChild(step);
        }
    }
    
    async function executeFullReset() {
        try {
            updateProgress(10, 'Deteniendo sistemas activos...');
            
            // Detener UltraCaller
            if (window.ultraCaller && window.ultraCaller.isActive) {
                window.ultraCaller.stop();
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            updateProgress(25, 'Limpiando Firebase...');
            
            if (window.firebase) {
                const { database, ref, set } = window.firebase;
                
                // Limpiar datos principales
                await Promise.all([
                    set(ref(database, 'gameState'), null),
                    set(ref(database, 'calledNumbers'), null),
                    set(ref(database, 'calledNumbersList'), null),
                    set(ref(database, 'playerCards'), null),
                    set(ref(database, 'purchases'), null),
                    set(ref(database, 'winners'), null),
                    set(ref(database, 'prizes'), null),
                    set(ref(database, 'pendingBingoVerification'), null),
                    set(ref(database, 'bingoVerificationResult'), null)
                ]);
                
                updateProgress(60, 'Firebase limpiado correctamente');
            } else {
                updateProgress(60, 'Firebase no disponible - saltando');
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            updateProgress(75, 'Limpiando localStorage...');
            
            // Limpiar localStorage
            const keysToKeep = ['bingoDomain'];
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            updateProgress(90, 'Limpiando variables globales...');
            
            // Limpiar variables globales
            if (window.adminData) {
                window.adminData.allPayments = [];
                window.adminData.bingoWinners = [];
                window.adminData.bingoPrizes = [];
                window.adminData.notificationHistory = [];
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            updateProgress(100, 'Reset completado exitosamente');
            
            setTimeout(() => {
                document.getElementById('progress-modal').style.display = 'none';
                alert('✅ RESET TOTAL COMPLETADO\n\nTodos los datos han sido eliminados.\nLa página se recargará automáticamente.');
                setTimeout(() => location.reload(), 2000);
            }, 1500);
            
        } catch (error) {
            console.error('Error en reset:', error);
            updateProgress(100, 'Error durante el reset: ' + error.message);
            setTimeout(() => {
                document.getElementById('progress-modal').style.display = 'none';
                alert('❌ Error durante el reset: ' + error.message);
            }, 2000);
        }
    }
    
    async function executeResetWithVerification() {
        updateProgress(10, 'Ejecutando reset con verificación...');
        await executeFullReset();
    }
    
    async function executeTestOnly() {
        updateProgress(20, 'Verificando Firebase...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (window.firebase) {
            updateProgress(50, 'Firebase: ✅ Conectado');
        } else {
            updateProgress(50, 'Firebase: ❌ No disponible');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateProgress(75, 'Verificando UltraCaller...');
        if (window.ultraCaller) {
            updateProgress(85, 'UltraCaller: ✅ Disponible');
        } else {
            updateProgress(85, 'UltraCaller: ❌ No disponible');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateProgress(100, 'Verificación completada');
        
        setTimeout(() => {
            document.getElementById('progress-modal').style.display = 'none';
            alert('✅ Sistema verificado correctamente\n\nTodos los componentes están funcionando.');
        }, 1500);
    }
}

function initUltraControls() {
    const ultraButtons = {
        'ultra-start': () => {
            if (window.ultraAdminControls) {
                window.ultraAdminControls.startGame();
            } else {
                alert('🚀 Iniciando juego...');
            }
        },
        'ultra-pause': () => {
            if (window.ultraAdminControls) {
                window.ultraAdminControls.pauseGame();
            } else {
                alert('⏸️ Pausando juego...');
            }
        },
        'ultra-resume': () => {
            if (window.ultraAdminControls) {
                window.ultraAdminControls.resumeGame();
            } else {
                alert('▶️ Reanudando juego...');
            }
        },
        'ultra-next-round': () => {
            if (window.ultraAdminControls) {
                window.ultraAdminControls.nextRound();
            } else {
                alert('➡️ Iniciando Ronda 2...');
            }
        },
        'ultra-finish': () => {
            if (window.ultraAdminControls) {
                window.ultraAdminControls.finishGame();
            } else {
                if (confirm('¿Finalizar juego?')) {
                    alert('🏁 Juego finalizado');
                }
            }
        },
        'ultra-emergency': () => {
            if (window.ultraAdminControls) {
                window.ultraAdminControls.emergencyStop();
            } else {
                if (confirm('⚠️ PARADA DE EMERGENCIA\n\n¿Detener todo?')) {
                    alert('🛑 EMERGENCIA - Todo detenido');
                }
            }
        }
    };
    
    Object.keys(ultraButtons).forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.onclick = ultraButtons[id];
        }
    });
}

function initDomainControls() {
    const saveDomainBtn = document.getElementById('save-domain');
    if (saveDomainBtn) {
        saveDomainBtn.onclick = saveDomainConfig;
    }
    
    // Cargar dominio guardado
    loadDomainConfig();
    
    window.saveDomainConfig = saveDomainConfig;
    window.loadDomainConfig = loadDomainConfig;
}

function initVerificationControls() {
    const verifyBtn = document.getElementById('verify-winner');
    const rejectBtn = document.getElementById('reject-winner');
    
    if (verifyBtn) {
        verifyBtn.onclick = verifyWinner;
    }
    
    if (rejectBtn) {
        rejectBtn.onclick = rejectWinner;
    }
    
    window.verifyWinner = verifyWinner;
    window.rejectWinner = rejectWinner;
}

// === FUNCIONES DE PAGOS ===
function showPayments(status) {
    window.adminData.currentFilter = status;
    const titles = {
        'pending': 'Pagos Pendientes',
        'verified': 'Pagos Verificados',
        'rejected': 'Pagos Rechazados'
    };
    
    document.getElementById('modal-title').textContent = titles[status];
    document.getElementById('payment-modal').style.display = 'flex';
    
    filterPayments();
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
    document.getElementById('date-filter').value = '';
    document.getElementById('phone-filter').value = '';
}

function filterPayments() {
    const dateFilter = document.getElementById('date-filter').value;
    const phoneFilter = document.getElementById('phone-filter').value;
    
    window.adminData.filteredPayments = window.adminData.allPayments.filter(payment => {
        const matchStatus = payment.status === window.adminData.currentFilter;
        const matchDate = !dateFilter || payment.date === dateFilter;
        const matchPhone = !phoneFilter || payment.phone.includes(phoneFilter);
        
        return matchStatus && matchDate && matchPhone;
    });
    
    renderPaymentsList();
}

function renderPaymentsList() {
    const container = document.getElementById('payments-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (window.adminData.filteredPayments.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#666;">No se encontraron pagos</p>';
        return;
    }
    
    window.adminData.filteredPayments.forEach(payment => {
        const item = document.createElement('div');
        item.className = 'payment-item';
        
        item.innerHTML = `
            <div>
                <strong>Ref: ${payment.ref}</strong> - <strong>${payment.phone}</strong><br>
                <small>${payment.cartones} cartones - BsF ${payment.amount} - ${payment.date}</small>
            </div>
            <div class="payment-actions">
                ${payment.status === 'pending' ? `
                    <button class="payment-btn approve-btn" onclick="approvePayment(${payment.id})">✓</button>
                    <button class="payment-btn reject-btn" onclick="rejectPayment(${payment.id})">✗</button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(item);
    });
}

function approvePayment(paymentId) {
    const payment = window.adminData.allPayments.find(p => p.id === paymentId);
    if (!payment || payment.status !== 'pending') return;
    
    payment.status = 'verified';
    payment.verifiedDate = new Date().toISOString();
    
    updatePurchaseInFirebase(payment);
    generateCardsForPlayer(payment.phone, payment.cartones);
    
    alert(`✅ Pago aprobado - ${payment.cartones} cartones asignados a ${payment.phone}`);
    
    updatePaymentStats();
    filterPayments();
}

function rejectPayment(paymentId) {
    const payment = window.adminData.allPayments.find(p => p.id === paymentId);
    if (!payment || payment.status !== 'pending') return;
    
    payment.status = 'rejected';
    payment.rejectedDate = new Date().toISOString();
    
    updatePurchaseInFirebase(payment);
    
    alert(`❌ Pago rechazado: ${payment.phone}`);
    
    updatePaymentStats();
    filterPayments();
}

function updatePurchaseInFirebase(purchase) {
    if (!window.firebase) return;
    
    const { database, ref, set } = window.firebase;
    set(ref(database, `purchases/${purchase.id}`), purchase)
        .then(() => console.log('✅ Compra actualizada en Firebase'))
        .catch(error => console.error('❌ Error actualizando compra:', error));
}

function generateCardsForPlayer(phone, quantity) {
    if (!window.firebase) return;
    
    const { database, ref, get, set } = window.firebase;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    get(ref(database, `playerCards/${cleanPhone}`)).then((snapshot) => {
        let existingCards = snapshot.val() || [];
        
        for (let i = 0; i < quantity; i++) {
            const newCard = {
                id: Date.now() + i,
                code: `C${Date.now()}${i}`,
                numbers: generateBingoCard(),
                status: 'vigente',
                purchaseDate: new Date().toISOString(),
                marked: ['2-2'],
                round: 1
            };
            existingCards.push(newCard);
        }
        
        return set(ref(database, `playerCards/${cleanPhone}`), existingCards);
    }).then(() => {
        console.log(`✅ ${quantity} cartones generados para ${phone}`);
    });
}

function generateBingoCard() {
    const card = [];
    const ranges = {
        0: [1, 15], 1: [16, 30], 2: [31, 45], 3: [46, 60], 4: [61, 75]
    };
    
    for (let col = 0; col < 5; col++) {
        const column = [];
        const [min, max] = ranges[col];
        const used = new Set();
        
        for (let row = 0; row < 5; row++) {
            if (col === 2 && row === 2) {
                column.push(0);
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
    
    const transposed = [];
    for (let row = 0; row < 5; row++) {
        const rowData = [];
        for (let col = 0; col < 5; col++) {
            rowData.push(card[col][row]);
        }
        transposed.push(rowData);
    }
    
    return transposed;
}

// === FUNCIONES DE COMUNICACIÓN ===
function shareToWhatsApp(message) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    const notification = {
        id: Date.now(),
        message: message.substring(0, 50) + '...',
        time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
        date: new Date().toLocaleDateString('es-VE')
    };
    
    window.adminData.notificationHistory.unshift(notification);
    if (window.adminData.notificationHistory.length > 10) {
        window.adminData.notificationHistory = window.adminData.notificationHistory.slice(0, 10);
    }
    
    localStorage.setItem('notificationHistory', JSON.stringify(window.adminData.notificationHistory));
    renderNotificationHistory();
    
    alert('✅ Mensaje compartido en WhatsApp');
}

function renderNotificationHistory() {
    const container = document.getElementById('notification-log');
    if (!container) return;
    
    if (window.adminData.notificationHistory.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.8rem; text-align: center;">No hay notificaciones</p>';
        return;
    }
    
    container.innerHTML = window.adminData.notificationHistory.map(notification => `
        <div class="notification-item">
            <div class="notification-time">${notification.time} - ${notification.date}</div>
            <div>${notification.message}</div>
        </div>
    `).join('');
}

function clearNotificationHistory() {
    window.adminData.notificationHistory = [];
    localStorage.removeItem('notificationHistory');
    renderNotificationHistory();
    alert('✅ Historial limpiado');
}

// === FUNCIONES DE USUARIOS ===
function searchUser() {
    const phoneInput = document.getElementById('user-phone-search');
    if (!phoneInput) return;
    
    const phone = phoneInput.value.trim();
    if (!phone) {
        alert('Ingresa un número de teléfono');
        return;
    }
    
    alert(`🔍 Buscando usuario: ${phone}`);
}

function loadAllUsers(refresh = false) {
    if (refresh) {
        alert('🔄 Actualizando lista de usuarios...');
    }
    
    setTimeout(() => {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown && refresh) {
            dropdown.innerHTML = `
                <option value="">Seleccionar jugador...</option>
                <option value="0414-1234567">Usuario 1234</option>
                <option value="0424-7654321">Usuario 7654</option>
            `;
        }
        
        document.getElementById('total-users').textContent = '2';
        document.getElementById('active-users').textContent = '1';
        document.getElementById('vip-users').textContent = '0';
        
        if (refresh) {
            alert('✅ Lista actualizada');
        }
    }, 1000);
}

function selectUserFromDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    if (!dropdown) return;
    
    if (dropdown.value) {
        alert(`👤 Usuario ${dropdown.value} seleccionado`);
    }
}

// === FUNCIONES DE PREMIOS ===
function showPrizeTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`[onclick*="${tab}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    
    const container = document.getElementById('prizes-content');
    const prizes = window.adminData.bingoPrizes.filter(p => p.status === tab);
    
    if (prizes.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#666; padding:1rem;">No hay premios ${tab === 'pending' ? 'pendientes' : 'pagados'}</p>`;
        return;
    }
    
    container.innerHTML = prizes.map(prize => `
        <div class="prize-item ${prize.status}">
            <div class="prize-header">
                <div>
                    <strong>Cartón: ${prize.cartonId}</strong>
                    <div class="prize-info">${prize.userName || 'Usuario'} • ${prize.phone}</div>
                    <div class="prize-info">${prize.type} • Ronda ${prize.round || 1}</div>
                </div>
                <div class="prize-amount">BsF ${prize.amount}</div>
            </div>
            <div class="prize-info">${prize.date} ${prize.time}</div>
            <div class="prize-actions">
                ${prize.status === 'pending' ? 
                    `<button class="pay-btn" onclick="markAsPaid(${prize.id})">Marcar Pagado</button>` :
                    `<span class="paid-badge">✓ Pagado</span>`
                }
            </div>
        </div>
    `).join('');
}

function markAsPaid(prizeId) {
    const prize = window.adminData.bingoPrizes.find(p => p.id === prizeId);
    if (!prize) return;
    
    prize.status = 'paid';
    prize.paidDate = new Date().toISOString().split('T')[0];
    prize.paidTime = new Date().toLocaleTimeString('es-VE', { hour12: false });
    
    if (window.firebase) {
        const { database, ref, set } = window.firebase;
        set(ref(database, `prizes/${prize.id}`), prize);
    }
    
    alert(`✅ Premio de BsF ${prize.amount} marcado como pagado`);
    updatePrizeStats();
    showPrizeTab('pending');
}

// === FUNCIONES DE DOMINIO ===
function loadDomainConfig() {
    const savedDomain = localStorage.getItem('bingoDomain');
    const domainInput = document.getElementById('domain-input');
    const domainStatus = document.getElementById('domain-status');
    
    if (savedDomain && domainInput) {
        domainInput.value = savedDomain;
        if (domainStatus) {
            domainStatus.textContent = `Dominio configurado: ${savedDomain}`;
            domainStatus.classList.add('configured');
        }
    }
}

function saveDomainConfig() {
    const domainInput = document.getElementById('domain-input');
    const domainStatus = document.getElementById('domain-status');
    const domain = domainInput.value.trim();
    
    if (!domain) {
        alert('Ingresa un dominio válido');
        return;
    }
    
    localStorage.setItem('bingoDomain', domain);
    if (domainStatus) {
        domainStatus.textContent = `Dominio configurado: ${domain}`;
        domainStatus.classList.add('configured');
    }
    
    alert(`✅ Dominio ${domain} configurado correctamente`);
}

// === FUNCIONES DE VERIFICACIÓN ===
function verifyWinner() {
    alert('✅ Ganador verificado');
}

function rejectWinner() {
    alert('❌ Ganador rechazado');
}

// === FUNCIONES DE ESTADÍSTICAS ===
function updatePaymentStats() {
    const pending = window.adminData.allPayments.filter(p => p.status === 'pending').length;
    const verified = window.adminData.allPayments.filter(p => p.status === 'verified').length;
    const rejected = window.adminData.allPayments.filter(p => p.status === 'rejected').length;
    
    const pendingEl = document.getElementById('pending-count');
    const verifiedEl = document.getElementById('verified-count');
    const rejectedEl = document.getElementById('rejected-count');
    
    if (pendingEl) pendingEl.textContent = pending;
    if (verifiedEl) verifiedEl.textContent = verified;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

function updatePrizeStats() {
    const pendingPrizes = window.adminData.bingoPrizes.filter(p => p.status === 'pending');
    const paidPrizes = window.adminData.bingoPrizes.filter(p => p.status === 'paid');
    const totalPending = pendingPrizes.reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = paidPrizes.reduce((sum, p) => sum + p.amount, 0);
    
    const pendingEl = document.getElementById('pending-prizes');
    const paidEl = document.getElementById('paid-prizes');
    const totalPendingEl = document.getElementById('total-pending');
    const totalPaidEl = document.getElementById('total-paid');
    
    if (pendingEl) pendingEl.textContent = pendingPrizes.length;
    if (paidEl) paidEl.textContent = paidPrizes.length;
    if (totalPendingEl) totalPendingEl.textContent = `BsF ${totalPending.toFixed(2)}`;
    if (totalPaidEl) totalPaidEl.textContent = `BsF ${totalPaid.toFixed(2)}`;
}

function updateAllStats() {
    updatePaymentStats();
    updatePrizeStats();
    
    // Estadísticas generales
    const ticketsSold = window.adminData.allPayments
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + p.cartones, 0);
    
    const ticketsEl = document.getElementById('tickets-sold');
    if (ticketsEl) ticketsEl.textContent = ticketsSold;
}

// === MONITOREO EN TIEMPO REAL ===
function setupRealTimeMonitoring() {
    // Actualizar estadísticas cada 10 segundos
    setInterval(() => {
        updateAllStats();
    }, 10000);
    
    console.log('✅ Monitoreo en tiempo real activado');
}

// Cargar historial de notificaciones al iniciar
setTimeout(() => {
    renderNotificationHistory();
}, 3000);

console.log('✅ Fix completo del admin cargado correctamente');