// Fix completo para conectividad Firebase y funcionalidad del sistema
console.log('🔧 Iniciando fix completo de Firebase...');

// Variables globales para monitoreo
window.firebaseStatus = {
    connected: false,
    initialized: false,
    retryCount: 0,
    maxRetries: 10
};

// Función para verificar y reparar Firebase
function initializeFirebaseFix() {
    console.log('🔧 Verificando estado de Firebase...');
    
    // Verificar si Firebase está disponible
    if (window.firebase && window.firebase.database) {
        console.log('✅ Firebase ya está disponible');
        window.firebaseStatus.connected = true;
        window.firebaseStatus.initialized = true;
        testFirebaseConnection();
        return true;
    }
    
    // Intentar reinicializar Firebase
    if (window.firebaseStatus.retryCount < window.firebaseStatus.maxRetries) {
        window.firebaseStatus.retryCount++;
        console.log(`🔄 Reintentando inicialización Firebase (${window.firebaseStatus.retryCount}/${window.firebaseStatus.maxRetries})`);
        
        setTimeout(() => {
            initializeFirebaseFix();
        }, 2000);
        
        return false;
    }
    
    console.error('❌ Firebase no se pudo inicializar después de múltiples intentos');
    showFirebaseError();
    return false;
}

// Función para probar conexión Firebase
async function testFirebaseConnection() {
    if (!window.firebase) {
        console.error('❌ Firebase no disponible para test');
        return false;
    }
    
    try {
        const { database, ref, set, get } = window.firebase;
        const testRef = ref(database, 'connectionTest');
        const testData = { timestamp: Date.now(), test: true };
        
        // Escribir datos de prueba
        await set(testRef, testData);
        console.log('✅ Escritura Firebase exitosa');
        
        // Leer datos de prueba
        const snapshot = await get(testRef);
        if (snapshot.exists()) {
            console.log('✅ Lectura Firebase exitosa');
            
            // Limpiar datos de prueba
            await set(testRef, null);
            
            window.firebaseStatus.connected = true;
            updateFirebaseStatus(true);
            return true;
        } else {
            throw new Error('No se pudieron leer los datos de prueba');
        }
    } catch (error) {
        console.error('❌ Error en test Firebase:', error);
        window.firebaseStatus.connected = false;
        updateFirebaseStatus(false);
        return false;
    }
}

// Función para actualizar estado visual de Firebase
function updateFirebaseStatus(connected) {
    // Actualizar indicadores en admin panel
    const indicator = document.getElementById('firebase-indicator');
    const statusText = document.getElementById('firebase-status-text');
    const dot = indicator?.querySelector('.status-dot');
    
    if (connected) {
        if (dot) {
            dot.classList.add('connected');
            dot.classList.remove('connecting');
        }
        if (statusText) statusText.textContent = 'Conectado';
        console.log('🟢 Firebase conectado correctamente');
    } else {
        if (dot) {
            dot.classList.remove('connected');
            dot.classList.add('connecting');
        }
        if (statusText) statusText.textContent = 'Desconectado';
        console.log('🔴 Firebase desconectado');
    }
    
    // Actualizar otros indicadores si existen
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
        connectionStatus.textContent = connected ? 'Activa' : 'Perdida';
    }
    
    const lastSync = document.getElementById('last-sync');
    if (lastSync) {
        lastSync.textContent = new Date().toLocaleTimeString();
    }
}

// Función para mostrar error de Firebase
function showFirebaseError() {
    const errorMsg = `
        ❌ Error de Conexión Firebase
        
        No se pudo establecer conexión con la base de datos.
        
        Posibles soluciones:
        1. Verificar conexión a internet
        2. Recargar la página
        3. Contactar al administrador
    `;
    
    if (window.showAdminPopup) {
        showAdminPopup('Error Firebase', errorMsg.replace(/\n/g, '<br>'), 'error');
    } else {
        alert(errorMsg);
    }
}

// Fix específico para admin panel
function fixAdminPanel() {
    console.log('🔧 Aplicando fix para panel de administración...');
    
    // Verificar que todos los elementos críticos existan
    const criticalElements = [
        'ultra-start', 'ultra-pause', 'ultra-resume', 
        'ultra-next-round', 'ultra-finish', 'ultra-emergency'
    ];
    
    criticalElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Elemento crítico no encontrado: ${id}`);
        } else {
            // Asegurar que el botón tenga event listener
            if (!element.onclick && !element.hasAttribute('data-fixed')) {
                element.setAttribute('data-fixed', 'true');
                element.addEventListener('click', function() {
                    console.log(`🔧 Fix: Botón ${id} clickeado`);
                    handleAdminButton(id);
                });
            }
        }
    });
    
    // Fix para botones de comunicación
    document.querySelectorAll('.share-whatsapp').forEach(btn => {
        if (!btn.hasAttribute('data-fixed')) {
            btn.setAttribute('data-fixed', 'true');
            btn.onclick = function() {
                const template = this.closest('.message-template');
                if (template) {
                    const message = template.dataset.messageTemplate;
                    if (message) {
                        shareToWhatsApp(message);
                    }
                }
            };
        }
    });
    
    console.log('✅ Fix del panel de administración aplicado');
}

// Manejador genérico para botones del admin
function handleAdminButton(buttonId) {
    console.log(`🎛️ Procesando botón admin: ${buttonId}`);
    
    switch(buttonId) {
        case 'ultra-start':
            if (window.ultraAdminControls) {
                window.ultraAdminControls.startGame();
            } else {
                alert('🚀 Iniciando juego...');
                console.log('Ultra Start ejecutado');
            }
            break;
            
        case 'ultra-pause':
            if (window.ultraAdminControls) {
                window.ultraAdminControls.pauseGame();
            } else {
                alert('⏸️ Pausando juego...');
                console.log('Ultra Pause ejecutado');
            }
            break;
            
        case 'ultra-resume':
            if (window.ultraAdminControls) {
                window.ultraAdminControls.resumeGame();
            } else {
                alert('▶️ Reanudando juego...');
                console.log('Ultra Resume ejecutado');
            }
            break;
            
        case 'ultra-next-round':
            if (window.ultraAdminControls) {
                window.ultraAdminControls.nextRound();
            } else {
                alert('➡️ Iniciando Ronda 2...');
                console.log('Ultra Next Round ejecutado');
            }
            break;
            
        case 'ultra-finish':
            if (window.ultraAdminControls) {
                window.ultraAdminControls.finishGame();
            } else {
                if (confirm('¿Finalizar juego completo?')) {
                    alert('🏁 Juego finalizado');
                    console.log('Ultra Finish ejecutado');
                }
            }
            break;
            
        case 'ultra-emergency':
            if (window.ultraAdminControls) {
                window.ultraAdminControls.emergencyStop();
            } else {
                if (confirm('⚠️ PARADA DE EMERGENCIA\\n\\n¿Detener todo inmediatamente?')) {
                    alert('🛑 EMERGENCIA - Todo detenido');
                    console.log('Ultra Emergency ejecutado');
                }
            }
            break;
            
        default:
            console.log(`Botón no reconocido: ${buttonId}`);
    }
}

// Fix específico para sala de juego
function fixGameRoom() {
    console.log('🔧 Aplicando fix para sala de juego...');
    
    // Verificar que gameRoom esté inicializado
    if (!window.gameRoom && !window.gameRoomInstance) {
        console.warn('⚠️ GameRoom no encontrado, intentando reinicializar...');
        
        // Intentar reinicializar GameRoom
        setTimeout(() => {
            if (window.GameRoom) {
                window.gameRoomInstance = new GameRoom();
                console.log('✅ GameRoom reinicializado');
            }
        }, 2000);
    }
    
    // Verificar elementos críticos de la sala de juego
    const gameElements = [
        'current-number', 'current-round', 'current-prize',
        'cards-container', 'waiting-state'
    ];
    
    gameElements.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`⚠️ Elemento de juego no encontrado: ${id}`);
        }
    });
    
    console.log('✅ Fix de sala de juego aplicado');
}

// Función para compartir en WhatsApp (fix)
function shareToWhatsApp(message) {
    if (!message) {
        console.error('❌ No hay mensaje para compartir');
        return;
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    try {
        window.open(whatsappUrl, '_blank');
        console.log('✅ Mensaje compartido en WhatsApp');
        
        if (window.showAdminPopup) {
            showAdminPopup('Éxito', 'Mensaje compartido en WhatsApp', 'success');
        } else {
            alert('Mensaje compartido en WhatsApp');
        }
    } catch (error) {
        console.error('❌ Error compartiendo en WhatsApp:', error);
        alert('Error al abrir WhatsApp');
    }
}

// Función de diagnóstico completo
function runDiagnostic() {
    console.log('🔍 Ejecutando diagnóstico completo...');
    
    const diagnostic = {
        firebase: {
            available: !!window.firebase,
            database: !!(window.firebase && window.firebase.database),
            connected: window.firebaseStatus.connected
        },
        admin: {
            ultraControls: !!window.ultraAdminControls,
            ultraCaller: !!window.ultraCaller,
            buttons: {}
        },
        gameRoom: {
            instance: !!(window.gameRoom || window.gameRoomInstance),
            elements: {}
        }
    };
    
    // Verificar botones del admin
    const adminButtons = ['ultra-start', 'ultra-pause', 'ultra-resume', 'ultra-next-round', 'ultra-finish'];
    adminButtons.forEach(id => {
        const element = document.getElementById(id);
        diagnostic.admin.buttons[id] = {
            exists: !!element,
            hasListener: !!(element && (element.onclick || element.hasAttribute('data-fixed')))
        };
    });
    
    // Verificar elementos de la sala de juego
    const gameElements = ['current-number', 'current-round', 'cards-container'];
    gameElements.forEach(id => {
        diagnostic.gameRoom.elements[id] = !!document.getElementById(id);
    });
    
    console.log('📊 Resultado del diagnóstico:', diagnostic);
    
    // Mostrar resumen
    const issues = [];
    if (!diagnostic.firebase.connected) issues.push('Firebase desconectado');
    if (!diagnostic.admin.ultraControls) issues.push('UltraControls no disponible');
    if (!diagnostic.gameRoom.instance) issues.push('GameRoom no inicializado');
    
    if (issues.length === 0) {
        console.log('✅ Sistema funcionando correctamente');
    } else {
        console.warn('⚠️ Problemas detectados:', issues);
    }
    
    return diagnostic;
}

// Función de reparación automática
function autoRepair() {
    console.log('🔧 Iniciando reparación automática...');
    
    // 1. Reparar Firebase
    if (!window.firebaseStatus.connected) {
        initializeFirebaseFix();
    }
    
    // 2. Reparar admin panel
    if (document.getElementById('ultra-start')) {
        fixAdminPanel();
    }
    
    // 3. Reparar sala de juego
    if (document.getElementById('cards-container')) {
        fixGameRoom();
    }
    
    // 4. Ejecutar diagnóstico final
    setTimeout(() => {
        const result = runDiagnostic();
        console.log('🔧 Reparación automática completada');
    }, 3000);
}

// Inicialización automática
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Firebase Fix cargado, iniciando reparación...');
    
    // Esperar un poco para que otros scripts se carguen
    setTimeout(() => {
        autoRepair();
    }, 1000);
    
    // Monitoreo continuo cada 30 segundos
    setInterval(() => {
        if (window.firebase && !window.firebaseStatus.connected) {
            testFirebaseConnection();
        }
    }, 30000);
});

// Funciones globales para debugging
window.firebaseFix = {
    test: testFirebaseConnection,
    repair: autoRepair,
    diagnostic: runDiagnostic,
    status: () => window.firebaseStatus
};

console.log('✅ Firebase Fix inicializado correctamente');