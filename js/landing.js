// Sistema de Cálculo de Premios - Landing Page
class PrizeCalculator {
    constructor() {
        this.TICKET_PRICE = 60;
        this.formatter = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        this.init();
    }

    init() {
        this.verifiedPurchases = [];
        this.loadPurchasesFromFirebase();
        this.updateTicketInfo();
        
        // Actualizar cada 30 segundos sin reload
        setInterval(() => this.updatePrizes(), 30000);
    }

    calculatePrizes() {
        // Usar datos desde Firebase si está disponible
        if (window.firebase && this.verifiedPurchases) {
            const ticketsSold = this.verifiedPurchases.reduce((sum, purchase) => sum + purchase.cartones, 0);
            const totalSales = this.TICKET_PRICE * ticketsSold;
            
            // Descontar 25% del dueño, el restante (75%) se reparte en premios
            const totalForPrizes = totalSales * 0.75;
            const prizeLine = totalForPrizes * 0.25; // 25% del monto de premios para Ronda 1
            const prizeFull = totalForPrizes * 0.75; // 75% del monto de premios para Ronda 2
            
            return { totalForPrizes, prizeLine, prizeFull };
        }
        
        // Fallback: sin datos
        return { totalForPrizes: 0, prizeLine: 0, prizeFull: 0 };
    }

    formatCurrency(amount) {
        return `BsF ${this.formatter.format(amount)}`;
    }

    updatePrizes() {
        const { totalForPrizes, prizeLine, prizeFull } = this.calculatePrizes();
        
        const elements = {
            total: document.getElementById('total-prize'),
            line: document.getElementById('prize-line'),
            full: document.getElementById('prize-full')
        };
        
        if (elements.total) elements.total.textContent = this.formatCurrency(totalForPrizes);
        if (elements.line) elements.line.textContent = this.formatCurrency(prizeLine);
        if (elements.full) elements.full.textContent = this.formatCurrency(prizeFull);
    }

    updateTicketInfo() {
        const ticketPriceEl = document.getElementById('ticket-price-info');
        if (ticketPriceEl) {
            const today = new Date().toLocaleDateString('es-VE');
            ticketPriceEl.textContent = `Precio por cartón: ${this.TICKET_PRICE} BsF (Válido por hoy: ${today})`;
        }
    }
    
    loadPurchasesFromFirebase() {
        if (!window.firebase) {
            console.log('Firebase no disponible en landing.js');
            this.updatePrizes();
            return;
        }
        
        const { database, ref, onValue } = window.firebase;
        onValue(ref(database, 'purchases'), (snapshot) => {
            const firebasePurchases = snapshot.val();
            if (firebasePurchases) {
                this.verifiedPurchases = Object.values(firebasePurchases).filter(p => p.status === 'verified');
                console.log('✅ Compras verificadas cargadas en landing:', this.verifiedPurchases.length);
            } else {
                this.verifiedPurchases = [];
            }
            this.updatePrizes();
        });
    }
}

// Inicializar automáticamente después de Firebase
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Esperar a que Firebase esté disponible
        setTimeout(() => new PrizeCalculator(), 1000);
    });
} else {
    setTimeout(() => new PrizeCalculator(), 1000);
}