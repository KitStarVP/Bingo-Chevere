document.addEventListener('DOMContentLoaded', () => {
    // ====================================
    //      LÓGICA DE CÁLCULO DE PREMIOS
    // ====================================

    // --- CONFIGURACIÓN ---
    const TICKET_PRICE = 60; // Costo de cada cartón
    
    // Leer cartones vendidos reales del admin
    const verifiedPurchases = JSON.parse(localStorage.getItem('verifiedPurchases') || '[]');
    const numberOfTicketsSold = verifiedPurchases.reduce((sum, purchase) => sum + purchase.cartones, 0);

    const totalSaleAmount = TICKET_PRICE * numberOfTicketsSold;

    // --- ELEMENTOS DEL DOM ---
    const totalPrizeEl = document.getElementById('total-prize');
    const prizeFullEl = document.getElementById('prize-full');
    const prizeLineEl = document.getElementById('prize-line');
    const ticketPriceInfoEl = document.getElementById('ticket-price-info');

    // --- CÁLCULOS DE PREMIOS ---
    const prizeForPlayers = totalSaleAmount * 0.75; // 75% total en premios (después de descontar 25% del dueño)
    const prizeLine = prizeForPlayers * 0.25; // 25% del monto de premios para Ronda 1 (Patrón)
    const prizeFull = prizeForPlayers * 0.75; // 75% del monto de premios para Ronda 2 (Cartón Lleno)

    // --- FORMATEADOR DE NÚMERO ---
    const numberFormatter = new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // --- ACTUALIZAR UI ---
    if (totalPrizeEl) {
        const prefix = 'BsF ';
        totalPrizeEl.textContent = prefix + numberFormatter.format(prizeForPlayers);
        prizeFullEl.textContent = prefix + numberFormatter.format(prizeFull);
        prizeLineEl.textContent = prefix + numberFormatter.format(prizeLine);
    }

    if (ticketPriceInfoEl) {
        const today = new Date().toLocaleDateString('es-VE');
        ticketPriceInfoEl.textContent = `Precio por cartón: ${TICKET_PRICE} BsF (Válido por hoy: ${today})`;
    }
    
    // Actualizar cada 5 segundos
    setTimeout(() => {
        location.reload();
    }, 5000);
});