document.addEventListener('DOMContentLoaded', () => {
    const TICKET_PRICE = 60;

    // --- Elementos del DOM ---
    const quantityInput = document.getElementById('quantity-input');
    const btnMinus = document.getElementById('btn-minus');
    const btnPlus = document.getElementById('btn-plus');
    const totalToPayEl = document.getElementById('total-to-pay');
    const paymentAmountEl = document.getElementById('payment-amount');
    const ticketPriceEl = document.getElementById('ticket-price');

    // --- Formateador de Moneda (reutilizado de landing.js) ---
    const numberFormatter = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    const formatAsCurrency = (number) => {
        return `${numberFormatter.format(number)} BsF`;
    };

    // --- Función para actualizar totales ---
    const updateTotals = () => {
        let quantity = parseInt(quantityInput.value, 10);

        // Validar que la cantidad sea un número válido y mayor a 0
        if (isNaN(quantity) || quantity < 1) {
            quantity = 1;
            quantityInput.value = '1';
        }

        const total = quantity * TICKET_PRICE;

        totalToPayEl.textContent = formatAsCurrency(total);
        paymentAmountEl.textContent = formatAsCurrency(total);
    };

    // --- Event Listeners ---
    btnMinus.addEventListener('click', () => {
        let currentValue = parseInt(quantityInput.value, 10);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
            updateTotals();
        }
    });

    btnPlus.addEventListener('click', () => {
        let currentValue = parseInt(quantityInput.value, 10);
        quantityInput.value = currentValue + 1;
        updateTotals();
    });

    quantityInput.addEventListener('input', updateTotals);
    quantityInput.addEventListener('change', updateTotals);

    // --- Restricción para campo de teléfono ---
    const phoneInput = document.getElementById('phone-input');
    phoneInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    });

    // --- Restricción para campo de referencia ---
    const referenceInput = document.getElementById('reference-input');
    referenceInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    });

    // --- Botón Finalizar Compra ---
    const submitButton = document.getElementById('submit-purchase');
    submitButton.addEventListener('click', () => {
        const phone = phoneInput.value;
        const reference = referenceInput.value;
        const quantity = parseInt(quantityInput.value);
        const total = quantity * TICKET_PRICE;
        
        // Validar teléfono
        if (phone.length !== 11 || !phone.startsWith('04')) {
            showPopup('Teléfono Inválido', 'Ingresa un número válido (04241234567)');
            return;
        }
        
        // Validar referencia
        if (reference.length !== 4) {
            showPopup('Referencia Incompleta', 'Por favor ingresa los 4 dígitos de la referencia');
            return;
        }
        
        // Guardar compra pendiente
        const purchase = {
            id: Date.now(),
            ref: reference,
            amount: total,
            cartones: quantity,
            phone: phone,
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            timestamp: Date.now()
        };
        
        // Agregar a localStorage para que admin la vea
        let pendingPurchases = JSON.parse(localStorage.getItem('pendingPurchases') || '[]');
        pendingPurchases.push(purchase);
        localStorage.setItem('pendingPurchases', JSON.stringify(pendingPurchases));
        
        window.location.href = `espera-confirmacion.html?ref=${reference}&cartones=${quantity}&purchaseId=${purchase.id}`;
    });

    // --- Inicialización ---
    ticketPriceEl.textContent = formatAsCurrency(TICKET_PRICE);
    updateTotals();
});
