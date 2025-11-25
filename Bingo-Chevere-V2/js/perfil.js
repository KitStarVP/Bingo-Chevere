// Perfil Móvil
class MobilePerfil {
    constructor() {
        this.init();
    }

    init() {
        this.checkSession();
        this.setupListeners();
    }

    checkSession() {
        const logged = localStorage.getItem('userLoggedIn');
        const phone = localStorage.getItem('userPhone');

        if (logged && phone) {
            this.showProfile(phone);
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('profile-section').style.display = 'none';
    }

    showProfile(phone) {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('profile-section').style.display = 'block';
        this.loadProfile(phone);
    }

    setupListeners() {
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const loginPin = document.getElementById('login-pin');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.login());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        if (loginPin) {
            loginPin.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
            });
        }
    }

    async login() {
        const phone = document.getElementById('login-phone').value;
        const pin = document.getElementById('login-pin').value.replace(/[^0-9]/g, '');

        if (phone.length !== 11 || !phone.startsWith('04')) {
            window.modal.warning('Teléfono inválido');
            return;
        }

        if (pin.length !== 4) {
            window.modal.warning('PIN debe tener 4 dígitos numéricos');
            return;
        }

        if (!window.firebase) {
            window.modal.error('Sistema no disponible');
            return;
        }

        const { database, ref, get } = window.firebase;
        const clean = phone.replace(/[^0-9]/g, '');

        try {
            const snap = await get(ref(database, `users/${clean}`));
            const user = snap.val();

            if (user && user.pin === this.hashPIN(pin)) {
                localStorage.setItem('userPhone', phone);
                localStorage.setItem('userLoggedIn', 'true');
                window.modal.success('Bienvenido');
                this.showProfile(phone);
            } else {
                window.modal.error('Credenciales incorrectas');
            }
        } catch (error) {
            window.modal.error('Error: ' + error.message);
        }
    }

    logout() {
        localStorage.removeItem('userPhone');
        localStorage.removeItem('userLoggedIn');
        this.showLogin();
    }

    async loadProfile(phone) {
        document.getElementById('user-phone').textContent = phone;

        if (!window.firebase) return;

        const { database, ref, get, onValue } = window.firebase;
        const clean = phone.replace(/[^0-9]/g, '');

        // Cargar usuario
        const userSnap = await get(ref(database, `users/${clean}`));
        const user = userSnap.val();
        if (user) {
            document.getElementById('user-name').textContent = user.name || `Usuario ${phone.slice(-4)}`;
        }

        // Cargar estadísticas
        onValue(ref(database, 'purchases'), snap => {
            const purchases = snap.val();
            if (purchases) {
                const userPurchases = Object.values(purchases).filter(p => (p.telefono === phone || p.phone === phone) && p.status === 'verified');
                const totalTickets = userPurchases.reduce((sum, p) => sum + p.cartones, 0);
                const totalSpent = userPurchases.reduce((sum, p) => sum + (p.monto || p.amount || 0), 0);
                
                document.getElementById('total-tickets').textContent = totalTickets;
                document.getElementById('total-spent').textContent = `${totalSpent} BsF`;
            }
        });

        onValue(ref(database, 'winners'), snap => {
            const winners = snap.val();
            if (winners) {
                const userWins = Object.values(winners).filter(w => w.phone === phone);
                const totalPrizes = userWins.reduce((sum, w) => sum + (w.amount || 0), 0);
                
                document.getElementById('total-wins').textContent = userWins.length;
                document.getElementById('total-prizes').textContent = `${Math.round(totalPrizes)} BsF`;
            }
        });
    }

    hashPIN(pin) {
        let hash = 0;
        for (let i = 0; i < pin.length; i++) {
            const char = pin.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => new MobilePerfil(), 1000);
});
