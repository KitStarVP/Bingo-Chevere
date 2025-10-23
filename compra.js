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

    submitPurchase() {
        const phone = this.elements.phone.value;
        const reference = this.elements.reference.value;
        const quantity = parseInt(this.elements.quantity.value);
        
        if (!this.validateInputs(phone, reference)) return;
        
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
        
        // Guardar en Firebase
        if (window.firebase) {
            const { database, ref, set } = window.firebase;
            set(ref(database, `purchases/${purchase.id}`), purchase)
                .then(() => {
                    // Mantener localStorage como backup
                    const pendingPurchases = JSON.parse(localStorage.getItem('pendingPurchases') || '[]');
                    pendingPurchases.push(purchase);
                    localStorage.setItem('pendingPurchases', JSON.stringify(pendingPurchases));
                    
                    window.location.href = `espera-confirmacion.html?ref=${reference}&cartones=${quantity}&purchaseId=${purchase.id}`;
                })
                .catch(error => {
                    alert('Error al procesar la compra: ' + error.message);
                });
        } else {
            alert('Error: Sistema no disponible');
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PurchaseSystem();
});