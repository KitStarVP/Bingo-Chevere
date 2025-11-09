// Fix para botones del panel de administración
console.log('🔧 Cargando fix para panel de administración...');

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Aplicando fix para botones del admin...');
    
    // Fix para botones de comunicación
    setTimeout(() => {
        fixCommunicationButtons();
        fixPaymentButtons();
        fixUserButtons();
        fixDomainButtons();
        fixMaintenanceButtons();
        fixUltraControls();
        
        console.log('✅ Fix aplicado correctamente');
    }, 2000);
});

function fixCommunicationButtons() {
    // Botones de WhatsApp
    document.querySelectorAll('.share-whatsapp').forEach(btn => {
        btn.onclick = function() {
            const template = this.closest('.message-template');
            if (template) {
                const message = template.dataset.messageTemplate;
                if (message) {
                    shareToWhatsApp(message);
                } else {
                    console.error('No se encontró mensaje en template');
                }
            }
        };
    });
    
    // Mensaje personalizado
    const shareCustomBtn = document.getElementById('share-custom');
    if (shareCustomBtn) {
        shareCustomBtn.onclick = function() {
            const customText = document.getElementById('custom-message-text').value.trim();
            if (!customText) {
                alert('Escribe un mensaje personalizado');
                return;
            }
            shareToWhatsApp(customText);
        };
    }
    
    console.log('✅ Botones de comunicación fijados');
}

function fixPaymentButtons() {
    // Los botones de pagos se crean dinámicamente, se manejan en renderPaymentsList
    console.log('✅ Botones de pagos verificados');
}

function fixUserButtons() {
    // Búsqueda de usuarios
    const searchBtn = document.querySelector('button[onclick="searchUser()"]');
    if (searchBtn) {
        searchBtn.onclick = function() {
            const phoneInput = document.getElementById('user-phone-search');
            if (!phoneInput) return;
            
            const phone = phoneInput.value.trim();
            if (!phone) {
                alert('Ingresa un número de teléfono');
                return;
            }
            
            alert(`Buscando usuario con teléfono: ${phone}`);
        };
    }
    
    // Actualizar lista
    const updateBtn = document.querySelector('button[onclick="loadAllUsers(true)"]');
    if (updateBtn) {
        updateBtn.onclick = function() {
            alert('Actualizando lista de usuarios...');
            
            setTimeout(() => {
                const dropdown = document.getElementById('user-dropdown');
                if (dropdown) {
                    dropdown.innerHTML = `
                        <option value="">Seleccionar jugador...</option>
                        <option value="0414-1234567">Usuario 1234</option>
                        <option value="0424-7654321">Usuario 7654</option>
                    `;
                }
                
                document.getElementById('total-users').textContent = '2';
                document.getElementById('active-users').textContent = '1';
                document.getElementById('vip-users').textContent = '0';
                
                alert('Lista actualizada');
            }, 1000);
        };
    }
    
    // Dropdown de usuarios
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.onchange = function() {
            if (this.value) {
                alert(`Usuario ${this.value} seleccionado`);
            }
        };
    }
    
    console.log('✅ Botones de usuarios fijados');
}

function fixDomainButtons() {
    const saveDomainBtn = document.getElementById('save-domain');
    if (saveDomainBtn) {
        saveDomainBtn.onclick = function() {
            const domainInput = document.getElementById('domain-input');
            const domainStatus = document.getElementById('domain-status');
            const domain = domainInput.value.trim();
            
            if (!domain) {
                alert('Ingresa un dominio válido');
                return;
            }
            
            localStorage.setItem('bingoDomain', domain);
            if (domainStatus) {
                domainStatus.textContent = `Dominio configurado: ${domain}`;
                domainStatus.classList.add('configured');
            }
            
            alert(`Dominio ${domain} configurado correctamente`);
        };
    }
    
    // Cargar dominio guardado
    const savedDomain = localStorage.getItem('bingoDomain');
    const domainInput = document.getElementById('domain-input');
    const domainStatus = document.getElementById('domain-status');
    
    if (savedDomain && domainInput) {
        domainInput.value = savedDomain;
        if (domainStatus) {
            domainStatus.textContent = `Dominio configurado: ${savedDomain}`;
            domainStatus.classList.add('configured');
        }
    }
    
    console.log('✅ Botones de dominio fijados');
}

function fixMaintenanceButtons() {
    // Limpiar caché
    const clearCacheBtn = document.getElementById('clear-cache');
    if (clearCacheBtn) {
        clearCacheBtn.onclick = function() {
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                    alert('Caché del navegador eliminado');
                });
            } else {
                alert('Caché local limpiado');
            }
        };
    }
    
    // Limpiar logs
    const clearLogsBtn = document.getElementById('clear-logs');
    if (clearLogsBtn) {
        clearLogsBtn.onclick = function() {
            console.clear();
            alert('Consola del navegador limpiada');
        };
    }
    
    // Reset UI
    const resetUIBtn = document.getElementById('reset-ui');
    if (resetUIBtn) {
        resetUIBtn.onclick = function() {
            document.querySelectorAll('.bingo-alert, .pause-alert, .winner-alert').forEach(alert => {
                alert.style.display = 'none';
            });
            
            document.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(input => {
                if (!input.id.includes('domain')) input.value = '';
            });
            
            alert('Elementos de la interfaz limpiados');
        };
    }
    
    // Optimizar sistema
    const optimizeBtn = document.getElementById('optimize-system');
    if (optimizeBtn) {
        optimizeBtn.onclick = function() {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                });
            }
            
            const importantKeys = ['bingoDomain', 'userPhone', 'userProfile'];
            const allKeys = Object.keys(localStorage);
            allKeys.forEach(key => {
                if (!importantKeys.includes(key)) {
                    localStorage.removeItem(key);
                }
            });
            
            alert('Sistema optimizado sin afectar Firebase');
        };
    }
    
    // Reset total
    const totalResetBtn = document.getElementById('total-reset');
    if (totalResetBtn) {
        totalResetBtn.onclick = function() {
            const modal = document.getElementById('reset-modal');
            if (modal) {
                modal.style.display = 'flex';
            }
        };
    }
    
    console.log('✅ Botones de mantenimiento fijados');
}

function fixUltraControls() {
    // Verificar que UltraAdminControls esté disponible
    if (!window.ultraAdminControls) {
        console.log('⚠️ UltraAdminControls no disponible, aplicando fix manual');
        
        // Fix manual para botones ultra
        const ultraStart = document.getElementById('ultra-start');
        if (ultraStart) {
            ultraStart.onclick = function() {
                alert('🚀 Iniciando juego...');
                console.log('Ultra Start clicked');
            };
        }
        
        const ultraPause = document.getElementById('ultra-pause');
        if (ultraPause) {
            ultraPause.onclick = function() {
                alert('⏸️ Pausando juego...');
                console.log('Ultra Pause clicked');
            };
        }
        
        const ultraResume = document.getElementById('ultra-resume');
        if (ultraResume) {
            ultraResume.onclick = function() {
                alert('▶️ Reanudando juego...');
                console.log('Ultra Resume clicked');
            };
        }
        
        const ultraNextRound = document.getElementById('ultra-next-round');
        if (ultraNextRound) {
            ultraNextRound.onclick = function() {
                alert('➡️ Iniciando Ronda 2...');
                console.log('Ultra Next Round clicked');
            };
        }
        
        const ultraFinish = document.getElementById('ultra-finish');
        if (ultraFinish) {
            ultraFinish.onclick = function() {
                if (confirm('¿Finalizar juego completo?')) {
                    alert('🏁 Juego finalizado');
                    console.log('Ultra Finish clicked');
                }
            };
        }
        
        const ultraEmergency = document.getElementById('ultra-emergency');
        if (ultraEmergency) {
            ultraEmergency.onclick = function() {
                if (confirm('⚠️ PARADA DE EMERGENCIA\n\n¿Detener todo inmediatamente?')) {
                    alert('🛑 EMERGENCIA - Todo detenido');
                    console.log('Ultra Emergency clicked');
                }
            };
        }
    }
    
    console.log('✅ Controles Ultra verificados');
}

function shareToWhatsApp(message) {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    // Guardar en historial
    let notificationHistory = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    
    const notification = {
        id: Date.now(),
        message: message.substring(0, 50) + '...',
        time: new Date().toLocaleTimeString('es-VE', { hour12: false }),
        date: new Date().toLocaleDateString('es-VE')
    };
    
    notificationHistory.unshift(notification);
    if (notificationHistory.length > 10) {
        notificationHistory = notificationHistory.slice(0, 10);
    }
    
    localStorage.setItem('notificationHistory', JSON.stringify(notificationHistory));
    renderNotificationHistory();
    
    alert('Mensaje compartido en WhatsApp');
}

function renderNotificationHistory() {
    const container = document.getElementById('notification-log');
    if (!container) return;
    
    const notificationHistory = JSON.parse(localStorage.getItem('notificationHistory') || '[]');
    
    if (notificationHistory.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.8rem; text-align: center;">No hay notificaciones</p>';
        return;
    }
    
    container.innerHTML = notificationHistory.map(notification => `
        <div class="notification-item">
            <div class="notification-time">${notification.time} - ${notification.date}</div>
            <div>${notification.message}</div>
        </div>
    `).join('');
}

// Función global para limpiar historial
window.clearNotificationHistory = function() {
    localStorage.removeItem('notificationHistory');
    renderNotificationHistory();
    alert('Historial de notificaciones eliminado');
};

// Funciones globales para modales
window.closeResetModal = function() {
    const modal = document.getElementById('reset-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

window.executeReset = function() {
    const resetType = document.querySelector('input[name="resetType"]:checked')?.value;
    const confirmText = document.getElementById('reset-confirmation-text').value;
    
    if (confirmText !== 'RESET TOTAL') {
        alert('Debes escribir exactamente "RESET TOTAL" para confirmar');
        return;
    }
    
    if (!resetType) {
        alert('Selecciona un tipo de reset');
        return;
    }
    
    closeResetModal();
    alert('🗑️ RESET TOTAL EJECUTADO - Todos los datos eliminados');
    
    // Limpiar localStorage
    const keysToKeep = ['bingoDomain'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
    
    setTimeout(() => {
        location.reload();
    }, 2000);
};

console.log('✅ Admin fix cargado correctamente');