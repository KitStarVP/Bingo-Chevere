function showPopup(title, message) {
    // Crear overlay si no existe
    let overlay = document.getElementById('popup-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'popup-overlay';
        overlay.className = 'popup-overlay';
        document.body.appendChild(overlay);
    }

    // Crear popup
    overlay.innerHTML = `
        <div class="popup">
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="popup-btn" onclick="closePopup()">Entendido</button>
        </div>
    `;

    // Mostrar popup
    setTimeout(() => overlay.classList.add('show'), 10);
}

function closePopup() {
    const overlay = document.getElementById('popup-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}