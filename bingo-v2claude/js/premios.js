// Premios Móvil
class MobilePremios {
    constructor() {
        this.PRICE = 60;
        this.init();
    }

    init() {
        this.waitForFirebase();
    }

    waitForFirebase(attempts = 0) {
        if (window.firebase) {
            this.loadPrizes();
            this.loadWinners();
        } else if (attempts < 10) {
            setTimeout(() => this.waitForFirebase(attempts + 1), 1000);
        }
    }

    loadPrizes() {
        const { database, ref, onValue } = window.firebase;
        
        onValue(ref(database, 'purchases'), snap => {
            const purchases = snap.val();
            if (purchases) {
                const verified = Object.values(purchases).filter(p => p.status === 'verified');
                const total = verified.reduce((sum, p) => sum + p.cartones, 0) * this.PRICE * 0.75;
                const pattern = total * 0.25;
                const full = total * 0.75;

                document.getElementById('total').textContent = `BsF ${Math.round(total).toLocaleString()}`;
                document.getElementById('pattern').textContent = `BsF ${Math.round(pattern).toLocaleString()}`;
                document.getElementById('full').textContent = `BsF ${Math.round(full).toLocaleString()}`;
            }
        });
    }

    loadWinners() {
        const { database, ref, onValue } = window.firebase;
        
        onValue(ref(database, 'winners'), snap => {
            const winners = snap.val();
            const container = document.getElementById('winners');
            
            if (!winners) {
                container.innerHTML = '<p style="text-align:center;color:var(--text-light)">No hay ganadores aún</p>';
                return;
            }

            const list = Object.values(winners).sort((a, b) => b.id - a.id).slice(0, 10);
            
            container.innerHTML = list.map(w => `
                <div class="winner-item">
                    <div class="winner-info">
                        <div class="winner-phone">${this.hidePhone(w.phone)}</div>
                        <div class="winner-date">${w.date} ${w.time}</div>
                    </div>
                    <div class="winner-prize">
                        <div class="winner-amount">BsF ${Math.round(w.amount)}</div>
                        <div class="winner-type">${w.type}</div>
                    </div>
                </div>
            `).join('');
        });
    }

    hidePhone(phone) {
        return phone.replace(/(\\d{4})(\\d{3})(\\d{4})/, '$1-***-$3');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MobilePremios();
});
