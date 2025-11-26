// Sistema de Modales Personalizados
class ModalSystem {
    constructor() {
        this.createModalContainer();
    }

    createModalContainer() {
        if (document.getElementById('custom-modal-container')) return;
        
        const container = document.createElement('div');
        container.id = 'custom-modal-container';
        container.innerHTML = `
            <style>
                .custom-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                    animation: fadeIn 0.2s;
                }
                .custom-modal-overlay.show {
                    display: flex;
                }
                .custom-modal {
                    background: white;
                    border-radius: 20px;
                    padding: 24px;
                    max-width: 400px;
                    width: 100%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    animation: slideUp 0.3s;
                }
                .custom-modal-icon {
                    font-size: 48px;
                    text-align: center;
                    margin-bottom: 16px;
                }
                .custom-modal-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #333;
                    text-align: center;
                    margin-bottom: 12px;
                }
                .custom-modal-message {
                    font-size: 15px;
                    color: #666;
                    text-align: center;
                    margin-bottom: 24px;
                    line-height: 1.5;
                }
                .custom-modal-buttons {
                    display: flex;
                    gap: 12px;
                }
                .custom-modal-btn {
                    flex: 1;
                    padding: 14px;
                    border: none;
                    border-radius: 12px;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .custom-modal-btn:active {
                    transform: scale(0.98);
                }
                .custom-modal-btn.primary {
                    background: linear-gradient(135deg, #6C63FF, #5A52D5);
                    color: white;
                }
                .custom-modal-btn.secondary {
                    background: #f0f0f0;
                    color: #666;
                }
                .custom-modal-btn.danger {
                    background: linear-gradient(135deg, #ff4757, #ff6348);
                    color: white;
                }
                .custom-modal-btn.success {
                    background: linear-gradient(135deg, #00D9A3, #00B87C);
                    color: white;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <div class="custom-modal-overlay" id="custom-modal-overlay">
                <div class="custom-modal">
                    <div class="custom-modal-icon" id="custom-modal-icon"></div>
                    <div class="custom-modal-title" id="custom-modal-title"></div>
                    <div class="custom-modal-message" id="custom-modal-message"></div>
                    <div class="custom-modal-buttons" id="custom-modal-buttons"></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }

    show(options) {
        const overlay = document.getElementById('custom-modal-overlay');
        const icon = document.getElementById('custom-modal-icon');
        const title = document.getElementById('custom-modal-title');
        const message = document.getElementById('custom-modal-message');
        const buttons = document.getElementById('custom-modal-buttons');

        icon.textContent = options.icon || '💬';
        title.textContent = options.title || '';
        message.textContent = options.message || '';
        
        buttons.innerHTML = '';
        
        if (options.buttons) {
            options.buttons.forEach(btn => {
                const button = document.createElement('button');
                button.className = `custom-modal-btn ${btn.type || 'primary'}`;
                button.textContent = btn.text;
                button.onclick = () => {
                    this.hide();
                    if (btn.onClick) btn.onClick();
                };
                buttons.appendChild(button);
            });
        }

        overlay.classList.add('show');
    }

    hide() {
        const overlay = document.getElementById('custom-modal-overlay');
        overlay.classList.remove('show');
    }

    alert(message, title = 'Aviso', icon = '💬') {
        return new Promise(resolve => {
            this.show({
                icon,
                title,
                message,
                buttons: [{
                    text: 'Aceptar',
                    type: 'primary',
                    onClick: resolve
                }]
            });
        });
    }

    confirm(message, title = 'Confirmar', icon = '❓') {
        return new Promise(resolve => {
            this.show({
                icon,
                title,
                message,
                buttons: [
                    {
                        text: 'Cancelar',
                        type: 'secondary',
                        onClick: () => resolve(false)
                    },
                    {
                        text: 'Confirmar',
                        type: 'primary',
                        onClick: () => resolve(true)
                    }
                ]
            });
        });
    }

    success(message, title = '¡Éxito!') {
        return this.alert(message, title, '✅');
    }

    error(message, title = 'Error') {
        return this.alert(message, title, '❌');
    }

    warning(message, title = 'Advertencia') {
        return this.alert(message, title, '⚠️');
    }

    info(message, title = 'Información') {
        return this.alert(message, title, 'ℹ️');
    }
}

// Crear instancia global
window.modal = new ModalSystem();

// Sobrescribir alert y confirm nativos
window.customAlert = window.modal.alert.bind(window.modal);
window.customConfirm = window.modal.confirm.bind(window.modal);
