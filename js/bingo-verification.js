/**
 * Sistema de Verificación de BINGO
 * Este archivo debe ser incluido en juego.html para manejar cuando un jugador canta BINGO
 */

// Función para cuando un jugador canta BINGO
function playerCallsBingo(cartonId, playerPhone) {
    // Pausar el juego
    const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
    gameState.isPaused = true;
    gameState.pauseReason = 'bingo_verification';
    localStorage.setItem('bingoGameState', JSON.stringify(gameState));
    
    // Crear registro de BINGO pendiente
    const bingoData = {
        cartonId: cartonId,
        phone: playerPhone,
        type: gameState.currentRound === 1 ? 'Patrón' : 'BINGO Completo',
        bingoTime: new Date().toISOString(),
        calledNumbers: gameState.calledNumbers || [],
        currentRound: gameState.currentRound || 1
    };
    
    localStorage.setItem('pendingBingoVerification', JSON.stringify(bingoData));
    
    // Mostrar mensaje al jugador
    showGameMessage('🎯 ¡BINGO CANTADO!', 'Tu BINGO está siendo verificado por el administrador. Por favor espera...', 'info');
    
    // Notificar a otros jugadores
    broadcastToPlayers('BINGO cantado - Verificación en proceso...');
}

// Función para verificar si el cartón realmente ganó (simplificada)
function verifyCartonWin(cartonNumbers, calledNumbers, isPatternRound) {
    if (isPatternRound) {
        // Verificar patrón específico
        return verifyPattern(cartonNumbers, calledNumbers);
    } else {
        // Verificar BINGO completo
        return verifyFullBingo(cartonNumbers, calledNumbers);
    }
}

// Verificar patrón (ejemplo: línea horizontal)
function verifyPattern(cartonNumbers, calledNumbers) {
    // Ejemplo de verificación de línea horizontal
    for (let row = 0; row < 5; row++) {
        let lineComplete = true;
        for (let col = 0; col < 5; col++) {
            if (col === 2 && row === 2) continue; // Espacio libre
            const number = cartonNumbers[row][col];
            if (!calledNumbers.find(called => called.number === number)) {
                lineComplete = false;
                break;
            }
        }
        if (lineComplete) return true;
    }
    return false;
}

// Verificar BINGO completo
function verifyFullBingo(cartonNumbers, calledNumbers) {
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
            if (col === 2 && row === 2) continue; // Espacio libre
            const number = cartonNumbers[row][col];
            if (!calledNumbers.find(called => called.number === number)) {
                return false;
            }
        }
    }
    return true;
}

// Mostrar mensaje en el juego
function showGameMessage(title, message, type = 'info') {
    // Crear toast personalizado
    const toast = document.createElement('div');
    toast.className = `verification-toast ${type}`;
    toast.innerHTML = `
        <div class="toast-header">
            <strong>${title}</strong>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Agregar estilos si no existen
    if (!document.getElementById('verification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'verification-styles';
        styles.textContent = `
            .verification-toast {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 300px;
                text-align: center;
                border: 3px solid #3498db;
                animation: toastShow 0.3s ease-out;
            }
            .verification-toast.warning {
                border-color: #ffc107;
            }
            .verification-toast.success {
                border-color: #28a745;
            }
            .toast-header {
                font-size: 1.1rem;
                color: #3498db;
                margin-bottom: 0.5rem;
            }
            .verification-toast.warning .toast-header {
                color: #ffc107;
            }
            .verification-toast.success .toast-header {
                color: #28a745;
            }
            .toast-body {
                font-size: 0.9rem;
                color: #666;
                line-height: 1.4;
            }
            @keyframes toastShow {
                from {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Transmitir mensaje a todos los jugadores
function broadcastToPlayers(message) {
    // En una implementación real, esto sería a través de WebSockets o similar
    console.log('Broadcast:', message);
}

// Escuchar cambios en el estado del juego
function listenForGameStateChanges() {
    let wasVerifying = false;
    
    setInterval(() => {
        const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
        const pendingVerification = localStorage.getItem('pendingBingoVerification');
        
        // Detectar cuando se inicia una verificación
        if (pendingVerification && !wasVerifying) {
            wasVerifying = true;
            showGameMessage('🚨 BINGO EN VERIFICACIÓN', 'El juego está pausado mientras se verifica el BINGO cantado...', 'warning');
        }
        
        // Detectar cuando termina la verificación
        if (!pendingVerification && wasVerifying) {
            wasVerifying = false;
            
            if (gameState.gameActive) {
                showGameMessage('✅ VERIFICACIÓN COMPLETADA', 'El juego continúa...', 'success');
            } else {
                showGameMessage('🏆 JUEGO TERMINADO', 'El BINGO ha sido completado', 'success');
            }
        }
    }, 1000);
}

// Reanudar el juego
function resumeGame() {
    // Esta función debe implementarse en juego.js
    console.log('Reanudando juego...');
}

// Función para que el jugador marque números automáticamente
function autoMarkNumbers() {
    const gameState = JSON.parse(localStorage.getItem('bingoGameState') || '{}');
    if (!gameState.calledNumbers) return;
    
    // Obtener cartón del jugador (esto debe venir de la sesión del jugador)
    const playerCarton = getPlayerCarton();
    if (!playerCarton) return;
    
    // Marcar números cantados
    gameState.calledNumbers.forEach(calledNumber => {
        markNumberOnCarton(playerCarton, calledNumber.number);
    });
}

// Obtener cartón del jugador actual
function getPlayerCarton() {
    // Esta función debe implementarse según cómo se almacenan los cartones
    return JSON.parse(localStorage.getItem('playerCarton') || 'null');
}

// Marcar número en el cartón
function markNumberOnCarton(carton, number) {
    // Esta función debe implementarse en juego.js
    console.log(`Marcando número ${number} en cartón`);
}

// Inicializar sistema de verificación
function initBingoVerification() {
    console.log('Inicializando sistema de verificación de BINGO...');
    listenForGameStateChanges();
    
    // Auto-marcar números cada segundo
    setInterval(autoMarkNumbers, 1000);
}

// Inicializar automáticamente cuando se carga el DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBingoVerification);
} else {
    initBingoVerification();
}

// Exportar funciones principales
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        playerCallsBingo,
        verifyCartonWin,
        initBingoVerification
    };
}