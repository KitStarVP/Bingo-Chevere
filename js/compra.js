// Sistema de Compra de Cartones - Arreglado
class PurchaseSystem {
    constructor() {
        this.TICKET_PRICE = 60;
        this.formatter = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.init();
    }

    init() {
        this.bindElements();
        this.setupEventListeners();
        this.updateTotals();
        
        if (this.elements.ticketPrice) {
            this.elements.ticketPrice.textContent = this.formatCurrency(this.TICKET_PRICE);
        }
    }

    bindElements() {
        this.elements = {
            quantity: document.getElementById('quantity-input'),
            btnMinus: document.getElementById('btn-minus'),
            btnPlus: document.getElementById('btn-plus'),
            totalToPay: document.getElementById('total-to-pay'),
            paymentAmount: document.getElementById('payment-amount'),
            ticketPrice: document.getElementById('ticket-price'),
            phone: document.getElementById('phone-input'),
            reference: document.getElementById('reference-input'),
            submit: document.getElementById('submit-purchase')
        };
    }

    setupEventListeners() {
        this.elements.btnMinus?.addEventListener('click', () => this.changeQuantity(-1));
        this.elements.btnPlus?.addEventListener('click', () => this.changeQuantity(1));
        this.elements.quantity?.addEventListener('input', () => this.updateTotals());
        this.elements.phone?.addEventListener('input', (e) => this.formatPhone(e));
        this.elements.reference?.addEventListener('input', (e) => this.formatReference(e));
        
        // Usar onclick directo para evitar conflictos
        if (this.elements.submit) {
            this.elements.submit.onclick = () => this.submitPurchase();
        }
    }

    formatCurrency(number) {
        return `${this.formatter.format(number)} BsF`;
    }

    changeQuantity(delta) {
        const current = parseInt(this.elements.quantity.value, 10) || 1;
        const newValue = Math.max(1, current + delta);
        this.elements.quantity.value = newValue;
        this.updateTotals();
    }

    updateTotals() {
        const quantity = Math.max(1, parseInt(this.elements.quantity.value, 10) || 1);
        this.elements.quantity.value = quantity;
        
        const total = quantity * this.TICKET_PRICE;
        const formatted = this.formatCurrency(total);
        
        if (this.elements.totalToPay) this.elements.totalToPay.textContent = formatted;
        if (this.elements.paymentAmount) this.elements.paymentAmount.textContent = formatted;
    }

    formatPhone(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    }

    formatReference(e) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    }

    validateInputs(phone, reference) {
        if (phone.length !== 11 || !phone.startsWith('04')) {
            alert('Ingresa un número válido (04241234567)');
            return false;
        }
        
        if (reference.length !== 4) {
            alert('Por favor ingresa los 4 dígitos de la referencia');
            return false;
        }
        
        return true;
    }

    async submitPurchase() {
        const phone = this.elements.phone.value;
        const reference = this.elements.reference.value;
        const quantity = parseInt(this.elements.quantity.value);
        
        if (!this.validateInputs(phone, reference)) return;
        
        // Verificar si hay partida activa
        const gameActive = await this.checkActiveGame();
        if (gameActive) {
            this.showGameActiveWarning(phone, reference, quantity);
        } else {
            // Verificar si el usuario ya existe
            await this.checkUserAndShowPIN(phone, reference, quantity);
        }
    }
    
    async checkUserAndShowPIN(phone, reference, quantity) {
        if (!window.firebase) {
            alert('Error: Sistema no disponible');
            return;
        }
        
        const { database, ref, get } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        try {
            const snapshot = await get(ref(database, `users/${cleanPhone}`));
            const userExists = snapshot.exists();
            
            this.showPINModal(phone, reference, quantity, userExists);
        } catch (error) {
            console.error('Error verificando usuario:', error);
            showPopup('Error', 'Error verificando usuario');
        }
    }
    
    showPINModal(phone, reference, quantity, userExists) {
        const modal = document.getElementById('pin-modal');
        const title = document.getElementById('pin-title');
        const phoneDisplay = document.getElementById('pin-phone');
        const createSection = document.getElementById('create-pin-section');
        const verifySection = document.getElementById('verify-pin-section');
        const confirmBtn = document.getElementById('pin-confirm');
        
        phoneDisplay.textContent = phone;
        
        if (userExists) {
            // Usuario existente - verificar PIN
            title.textContent = '🔐 VERIFICAR IDENTIDAD';
            createSection.style.display = 'none';
            verifySection.style.display = 'block';
            confirmBtn.textContent = 'Verificar y Continuar';
        } else {
            // Usuario nuevo - crear PIN
            title.textContent = '📱 CREAR CUENTA DE USUARIO';
            createSection.style.display = 'block';
            verifySection.style.display = 'none';
            confirmBtn.textContent = 'Crear Cuenta y Continuar';
        }
        
        modal.style.display = 'flex';
        
        // Event listeners
        document.getElementById('pin-cancel').onclick = () => {
            modal.style.display = 'none';
        };
        
        confirmBtn.onclick = () => {
            if (userExists) {
                this.verifyPIN(phone, reference, quantity);
            } else {
                this.createUser(phone, reference, quantity);
            }
        };
    }
    
    async createUser(phone, reference, quantity) {
        const newPin = document.getElementById('new-pin').value;
        const confirmPin = document.getElementById('confirm-pin').value;
        
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            showPopup('Error', 'El PIN debe tener 4 dígitos');
            return;
        }
        
        if (newPin !== confirmPin) {
            showPopup('Error', 'Los PINs no coinciden');
            return;
        }
        
        const { database, ref, set } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        const userData = {
            phone: phone,
            pin: this.hashPIN(newPin),
            createdDate: new Date().toISOString(),
            name: `Usuario ${phone.slice(-4)}`
        };
        
        try {
            await set(ref(database, `users/${cleanPhone}`), userData);
            console.log('✅ Usuario creado');
            
            // Auto-login
            localStorage.setItem('userPhone', phone);
            localStorage.setItem('userLoggedIn', 'true');
            
            this.processPurchase(phone, reference, quantity);
        } catch (error) {
            showPopup('Error', 'Error creando usuario: ' + error.message);
        }
    }
    
    async verifyPIN(phone, reference, quantity) {
        const enteredPin = document.getElementById('verify-pin').value;
        
        if (enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
            showPopup('Error', 'Ingresa un PIN de 4 dígitos');
            return;
        }
        
        const { database, ref, get } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        try {
            const snapshot = await get(ref(database, `users/${cleanPhone}`));
            const userData = snapshot.val();
            
            if (userData && userData.pin === this.hashPIN(enteredPin)) {
                console.log('✅ PIN correcto');
                
                // Auto-login
                localStorage.setItem('userPhone', phone);
                localStorage.setItem('userLoggedIn', 'true');
                
                this.processPurchase(phone, reference, quantity);
            } else {
                showPopup('Error', 'PIN incorrecto');
            }
        } catch (error) {
            showPopup('Error', 'Error verificando PIN: ' + error.message);
        }
    }
    
    processPurchase(phone, reference, quantity) {
        const purchase = {
            id: Date.now(),
            ref: reference,
            amount: quantity * this.TICKET_PRICE,
            cartones: quantity,
            phone: phone,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            timestamp: Date.now()
        };
        
        const { database, ref, set } = window.firebase;
        set(ref(database, `purchases/${purchase.id}`), purchase)
            .then(() => {
                console.log('✅ Compra guardada en Firebase');
                document.getElementById('pin-modal').style.display = 'none';
                window.location.href = `espera-confirmacion.html?ref=${reference}&cartones=${quantity}&purchaseId=${purchase.id}`;
            })
            .catch(error => {
                showPopup('Error', 'Error al procesar la compra: ' + error.message);
            });
    }
    
    async checkActiveGame() {
        if (!window.firebase) return false;
        
        const { database, ref, get } = window.firebase;
        try {
            const snapshot = await get(ref(database, 'gameState'));
            const gameState = snapshot.val();
            return gameState && gameState.gameActive;
        } catch (error) {
            console.error('Error verificando juego activo:', error);
            return false;
        }
    }
    
    showGameActiveWarning(phone, reference, quantity) {
        const confirmed = confirm(
            '🚨 PARTIDA EN CURSO 🚨\n\n' +
            'Los cartones que compres serán válidos\n' +
            'SOLO para la PRÓXIMA partida.\n\n' +
            'Partida actual en progreso...\n' +
            'Tus cartones estarán listos cuando termine.\n\n' +
            '¿Confirmas comprar para la próxima partida?'
        );
        
        if (confirmed) {
            this.checkUserAndShowPIN(phone, reference, quantity, true);
        }
    }
    
    async checkUserAndShowPIN(phone, reference, quantity, forNextGame = false) {
        if (!window.firebase) {
            alert('Error: Sistema no disponible');
            return;
        }
        
        const { database, ref, get } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        try {
            const snapshot = await get(ref(database, `users/${cleanPhone}`));
            const userExists = snapshot.exists();
            
            this.showPINModal(phone, reference, quantity, userExists, forNextGame);
        } catch (error) {
            console.error('Error verificando usuario:', error);
            showPopup('Error', 'Error verificando usuario');
        }
    }
    
    showPINModal(phone, reference, quantity, userExists, forNextGame = false) {
        const modal = document.getElementById('pin-modal');
        const title = document.getElementById('pin-title');
        const phoneDisplay = document.getElementById('pin-phone');
        const createSection = document.getElementById('create-pin-section');
        const verifySection = document.getElementById('verify-pin-section');
        const confirmBtn = document.getElementById('pin-confirm');
        
        phoneDisplay.textContent = phone;
        
        if (userExists) {
            // Usuario existente - verificar PIN
            title.textContent = '🔐 VERIFICAR IDENTIDAD';
            createSection.style.display = 'none';
            verifySection.style.display = 'block';
            confirmBtn.textContent = 'Verificar y Continuar';
        } else {
            // Usuario nuevo - crear PIN
            title.textContent = '📱 CREAR CUENTA DE USUARIO';
            createSection.style.display = 'block';
            verifySection.style.display = 'none';
            confirmBtn.textContent = 'Crear Cuenta y Continuar';
        }
        
        modal.style.display = 'flex';
        
        // Event listeners
        document.getElementById('pin-cancel').onclick = () => {
            modal.style.display = 'none';
        };
        
        confirmBtn.onclick = () => {
            if (userExists) {
                this.verifyPIN(phone, reference, quantity, forNextGame);
            } else {
                this.createUser(phone, reference, quantity, forNextGame);
            }
        };
    }
    
    async createUser(phone, reference, quantity, forNextGame = false) {
        const newPin = document.getElementById('new-pin').value;
        const confirmPin = document.getElementById('confirm-pin').value;
        
        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            showPopup('Error', 'El PIN debe tener 4 dígitos');
            return;
        }
        
        if (newPin !== confirmPin) {
            showPopup('Error', 'Los PINs no coinciden');
            return;
        }
        
        const { database, ref, set } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        const userData = {
            phone: phone,
            pin: this.hashPIN(newPin),
            createdDate: new Date().toISOString(),
            name: `Usuario ${phone.slice(-4)}`
        };
        
        try {
            await set(ref(database, `users/${cleanPhone}`), userData);
            console.log('✅ Usuario creado');
            
            // Auto-login
            localStorage.setItem('userPhone', phone);
            localStorage.setItem('userLoggedIn', 'true');
            
            this.processPurchase(phone, reference, quantity, forNextGame);
        } catch (error) {
            showPopup('Error', 'Error creando usuario: ' + error.message);
        }
    }
    
    async verifyPIN(phone, reference, quantity, forNextGame = false) {
        const enteredPin = document.getElementById('verify-pin').value;
        
        if (enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
            showPopup('Error', 'Ingresa un PIN de 4 dígitos');
            return;
        }
        
        const { database, ref, get } = window.firebase;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        
        try {
            const snapshot = await get(ref(database, `users/${cleanPhone}`));
            const userData = snapshot.val();
            
            if (userData && userData.pin === this.hashPIN(enteredPin)) {
                console.log('✅ PIN correcto');
                
                // Auto-login
                localStorage.setItem('userPhone', phone);
                localStorage.setItem('userLoggedIn', 'true');
                
                this.processPurchase(phone, reference, quantity, forNextGame);
            } else {
                showPopup('Error', 'PIN incorrecto');
            }
        } catch (error) {
            showPopup('Error', 'Error verificando PIN: ' + error.message);
        }
    }
    
    processPurchase(phone, reference, quantity, forNextGame = false) {
        const purchase = {
            id: Date.now(),
            ref: reference,
            amount: quantity * this.TICKET_PRICE,
            cartones: quantity,
            phone: phone,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            timestamp: Date.now(),
            forNextGame: forNextGame // Marcar si es para próxima partida
        };
        
        const { database, ref, set } = window.firebase;
        set(ref(database, `purchases/${purchase.id}`), purchase)
            .then(() => {
                console.log('✅ Compra guardada en Firebase');
                document.getElementById('pin-modal').style.display = 'none';
                window.location.href = `espera-confirmacion.html?ref=${reference}&cartones=${quantity}&purchaseId=${purchase.id}`;
            })
            .catch(error => {
                showPopup('Error', 'Error al procesar la compra: ' + error.message);
            });
    }
    
    hashPIN(pin) {
        // Simple hash para el PIN (en producción usar algo más seguro)
        let hash = 0;
        for (let i = 0; i < pin.length; i++) {
            const char = pin.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PurchaseSystem();
});