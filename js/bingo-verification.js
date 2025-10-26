// Sistema de Verificación de BINGO - Optimizado
class BingoVerification {
    constructor() {
        this.wasVerifying = false;
        this.init();
    }

    init() {
        this.listenForGameStateChanges();
    }

    showGameMessage(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `verification-toast ${type}`;
        toast.innerHTML = `
            <div class="toast-header"><strong>${title}</strong></div>
            <div class="toast-body">${message}</div>
        `;
        
        this.addStyles();
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 4000);
    }

    addStyles() {
        if (document.getElementById('verification-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'verification-styles';
        styles.textContent = `
            .verification-toast {
                position: fixed; top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: white; border-radius: 12px; padding: 1.5rem;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 10000; max-width: 300px; text-align: center;
                border: 3px solid #3498db;
                animation: toastShow 0.3s ease-out;
            }
            .verification-toast.warning { border-color: #ffc107; }
            .verification-toast.success { border-color: #28a745; }
            .toast-header { font-size: 1.1rem; color: #3498db; margin-bottom: 0.5rem; }
            .verification-toast.warning .toast-header { color: #ffc107; }
            .verification-toast.success .toast-header { color: #28a745; }
            .toast-body { font-size: 0.9rem; color: #666; line-height: 1.4; }
            @keyframes toastShow {
                from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    listenForGameStateChanges() {
        setInterval(() => {
            const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
            const pendingVerification = localStorage.getItem('pendingBingoVerification');
            
            if (pendingVerification && !this.wasVerifying) {
                this.wasVerifying = true;
                this.showGameMessage('🚨 BINGO EN VERIFICACIÓN', 'El juego está pausado mientras se verifica el BINGO cantado...', 'warning');
            }
            
            if (!pendingVerification && this.wasVerifying) {
                this.wasVerifying = false;
                const message = gameState.gameActive ? 'El juego continúa...' : 'El BINGO ha sido completado';
                const title = gameState.gameActive ? '✅ VERIFICACIÓN COMPLETADA' : '🏆 JUEGO TERMINADO';
                this.showGameMessage(title, message, 'success');
            }
        }, 1000);
    }
}

// Inicializar automáticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new BingoVerification());
} else {
    new BingoVerification();
}