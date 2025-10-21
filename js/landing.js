document.addEventListener('DOMContentLoaded', () => {
    // ====================================
    //      LÓGICA DE CÁLCULO DE PREMIOS
    // ====================================

    // --- CONFIGURACIÓN ---
    const TICKET_PRICE = 60; // Costo de cada cartón
    
    // Número de cartones vendidos para la simulación visual.
    const numberOfTicketsSold = 20;

    const totalSaleAmount = TICKET_PRICE * numberOfTicketsSold;

    // --- ELEMENTOS DEL DOM ---
    const totalPrizeEl = document.getElementById('total-prize');
    const prizeFullEl = document.getElementById('prize-full');
    const prizeLineEl = document.getElementById('prize-line');
    const ticketPriceInfoEl = document.getElementById('ticket-price-info');

    // --- CÁLCULOS DE PREMIOS ---
    const prizeForPlayers = totalSaleAmount * 0.75;
    const prizeFull = totalSaleAmount * 0.50;
    const prizeLine = totalSaleAmount * 0.25;

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
});