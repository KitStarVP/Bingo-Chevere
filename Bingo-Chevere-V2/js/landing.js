// Landing Page - Versión Móvil
class MobileLanding {
    constructor() {
        this.TICKET_PRICE = 60;
        this.init();
    }

    init() {
        this.setupAdminAccess();
        this.loadPrizes();
        setInterval(() => this.loadPrizes(), 30000);
    }

    setupAdminAccess() {
        let clicks = 0;
        const btn = document.getElementById('admin-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                clicks++;
                if (clicks === 3) {
                    window.location.href = 'admin.html';
                }
                setTimeout(() => clicks = 0, 2000);
            });
        }
    }

    loadPrizes() {
        if (!window.firebase) {
            setTimeout(() => this.loadPrizes(), 1000);
            return;
        }

        const { database, ref, onValue } = window.firebase;
        onValue(ref(database, 'purchases'), (snapshot) => {
            const purchases = snapshot.val();
            if (purchases) {
                const verified = Object.values(purchases).filter(p => p.status === 'verified');
                const totalTickets = verified.reduce((sum, p) => sum + p.cartones, 0);
                const totalSales = totalTickets * this.TICKET_PRICE;
                const totalPrizes = totalSales * 0.75;
                const prizePattern = totalPrizes * 0.25;
                const prizeFull = totalPrizes * 0.75;

                this.updateUI(totalPrizes, prizePattern, prizeFull);
            }
        });
    }

    updateUI(total, pattern, full) {
        const format = (n) => `BsF ${Math.round(n).toLocaleString()}`;
        
        const totalEl = document.getElementById('total-prize');
        const patternEl = document.getElementById('prize-pattern');
        const fullEl = document.getElementById('prize-full');

        if (totalEl) totalEl.textContent = format(total);
        if (patternEl) patternEl.textContent = format(pattern);
        if (fullEl) fullEl.textContent = format(full);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => new MobileLanding(), 1000);
});
