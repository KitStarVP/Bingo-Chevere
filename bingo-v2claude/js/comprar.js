// Sistema de Compra Móvil
class MobileCompra {
    constructor() {
        this.PRICE = 60;
        this.init();
    }

    init() {
        this.bindElements();
        this.setupListeners();
        this.updateTotal();
    }

    bindElements() {
        this.phone = document.getElementById('phone');
        this.quantity = document.getElementById('quantity');
        this.reference = document.getElementById('reference');
        this.minus = document.getElementById('minus');
        this.plus = document.getElementById('plus');
        this.submit = document.getElementById('submit');
        this.total = document.getElementById('total');
        this.amount = document.getElementById('amount');
    }

    setupListeners() {
        this.minus.addEventListener('click', () => this.changeQty(-1));
        this.plus.addEventListener('click', () => this.changeQty(1));
        this.quantity.addEventListener('input', () => this.updateTotal());
        this.phone.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
        });
        this.reference.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
        });
        
        // Navegación entre pasos
        document.getElementById('next-1').addEventListener('click', () => this.goToStep2());
        document.getElementById('next-2').addEventListener('click', () => this.goToStep3());
        document.getElementById('next-3').addEventListener('click', () => this.validateAndGoToStep4());
        document.getElementById('finish').addEventListener('click', () => this.handleSubmit());
    }

    goToStep2() {
        const phone = this.phone.value;
        if (phone.length !== 11 || !phone.startsWith('04')) {
            alert('Ingresa un teléfono válido (04241234567)');
            return;
        }
        document.getElementById('step-1').style.display = 'none';
        document.getElementById('step-2').style.display = 'block';
        document.getElementById('indicator-1').classList.remove('active');
        document.getElementById('indicator-2').classList.add('active');
    }

    goToStep3() {
        document.getElementById('step-2').style.display = 'none';
        document.getElementById('step-3').style.display = 'block';
        document.getElementById('indicator-2').classList.remove('active');
        document.getElementById('indicator-3').classList.add('active');
    }

    validateAndGoToStep4() {
        const ref = this.reference.value;
        if (ref.length !== 4) {
            alert('Ingresa los 4 dígitos de la referencia');
            return;
        }
        this.goToStep4();
    }

    goToStep4() {
        const phone = this.phone.value;
        const qty = parseInt(this.quantity.value);
        const ref = this.reference.value;
        const total = qty * this.PRICE;

        document.getElementById('summary-phone').textContent = phone;
        document.getElementById('summary-qty').textContent = qty;
        document.getElementById('summary-total').textContent = `${total} BsF`;
        document.getElementById('summary-ref').textContent = ref;

        document.getElementById('step-3').style.display = 'none';
        document.getElementById('step-4').style.display = 'block';
        document.getElementById('indicator-3').classList.remove('active');
        document.getElementById('indicator-4').classList.add('active');
    }

    changeQty(delta) {
        const current = parseInt(this.quantity.value) || 1;
        const newVal = Math.max(1, current + delta);
        this.quantity.value = newVal;
        this.updateTotal();
    }

    updateTotal() {
        const qty = parseInt(this.quantity.value) || 1;
        const total = qty * this.PRICE;
        this.total.textContent = `${total} BsF`;
        this.amount.textContent = `${total} BsF`;
    }

    async handleSubmit() {
        const phone = this.phone.value;
        const ref = this.reference.value;
        const qty = parseInt(this.quantity.value);

        await this.checkUser(phone, ref, qty);
    }

    async checkUser(phone, ref, qty) {
        if (!window.firebase) {
            alert('Sistema no disponible');
            return;
        }

        const { database, ref: dbRef, get } = window.firebase;
        const clean = phone.replace(/[^0-9]/g, '');

        try {
            const snap = await get(dbRef(database, `users/${clean}`));
            const exists = snap.exists();
            this.showPINModal(phone, ref, qty, exists);
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    showPINModal(phone, ref, qty, exists) {
        const modal = document.getElementById('pin-modal');
        const title = document.getElementById('pin-title');
        const subtitle = document.getElementById('pin-subtitle');
        const createSection = document.getElementById('create-section');
        const verifySection = document.getElementById('verify-section');
        const confirmBtn = document.getElementById('pin-confirm');

        if (exists) {
            title.textContent = 'Verificar PIN';
            subtitle.textContent = 'Ingresa tu PIN de 4 dígitos';
            createSection.style.display = 'none';
            verifySection.style.display = 'block';
            confirmBtn.textContent = 'Verificar';
        } else {
            title.textContent = 'Crear PIN';
            subtitle.textContent = 'Protege tu cuenta con un PIN de 4 dígitos';
            createSection.style.display = 'block';
            verifySection.style.display = 'none';
            confirmBtn.textContent = 'Crear Cuenta';
        }

        modal.classList.add('show');

        document.getElementById('pin-cancel').onclick = () => {
            modal.classList.remove('show');
        };

        confirmBtn.onclick = () => {
            if (exists) {
                this.verifyPIN(phone, ref, qty);
            } else {
                this.createUser(phone, ref, qty);
            }
        };
    }

    async createUser(phone, ref, qty) {
        const newPin = document.getElementById('new-pin').value;
        const confirmPin = document.getElementById('confirm-pin').value;

        if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            alert('PIN debe tener 4 dígitos');
            return;
        }

        if (newPin !== confirmPin) {
            alert('Los PINs no coinciden');
            return;
        }

        const { database, ref: dbRef, set } = window.firebase;
        const clean = phone.replace(/[^0-9]/g, '');

        const userData = {
            phone,
            pin: this.hashPIN(newPin),
            createdDate: new Date().toISOString(),
            name: `Usuario ${phone.slice(-4)}`
        };

        try {
            await set(dbRef(database, `users/${clean}`), userData);
            localStorage.setItem('userPhone', phone);
            localStorage.setItem('userLoggedIn', 'true');
            this.processPurchase(phone, ref, qty);
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    async verifyPIN(phone, ref, qty) {
        const pin = document.getElementById('verify-pin').value;

        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            alert('Ingresa un PIN de 4 dígitos');
            return;
        }

        const { database, ref: dbRef, get } = window.firebase;
        const clean = phone.replace(/[^0-9]/g, '');

        try {
            const snap = await get(dbRef(database, `users/${clean}`));
            const userData = snap.val();

            if (userData && userData.pin === this.hashPIN(pin)) {
                localStorage.setItem('userPhone', phone);
                localStorage.setItem('userLoggedIn', 'true');
                this.processPurchase(phone, ref, qty);
            } else {
                alert('PIN incorrecto');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    }

    processPurchase(phone, ref, qty) {
        const purchase = {
            id: Date.now(),
            ref,
            amount: qty * this.PRICE,
            cartones: qty,
            phone,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
            status: 'pending',
            timestamp: Date.now()
        };

        const { database, ref: dbRef, set } = window.firebase;
        set(dbRef(database, `purchases/${purchase.id}`), purchase)
            .then(() => {
                console.log('✅ Compra guardada:', purchase);
                document.getElementById('pin-modal').classList.remove('show');
                this.goToStep4();
            })
            .catch(error => {
                console.error('❌ Error:', error);
                alert('Error: ' + error.message);
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
    new MobileCompra();
});
