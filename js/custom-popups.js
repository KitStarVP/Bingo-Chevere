/**
 * Sistema de Popups Personalizados
 * Proporciona alertas, confirmaciones y prompts con estilos personalizados
 */
class CustomPopups {
    constructor() {
        this.currentResolve = null;
        this.createPopupContainer();
    }

    /**
     * Crea el contenedor de popups en el DOM
     */
    createPopupContainer() {
        if (document.getElementById('custom-popup-container')) return;
        
        const container = document.createElement('div');
        container.id = 'custom-popup-container';
        
        // Crear estilos
        const style = document.createElement('style');
        style.textContent = this.getPopupStyles();
        container.appendChild(style);
        
        // Crear estructura HTML
        const overlay = document.createElement('div');
        overlay.id = 'custom-popup-overlay';
        overlay.className = 'custom-popup-overlay';
        overlay.style.display = 'none';
        overlay.innerHTML = this.getPopupHTML();
        
        container.appendChild(overlay);
        document.body.appendChild(container);
    }

    /**
     * Retorna los estilos CSS para los popups
     */
    getPopupStyles() {
        return `
            .custom-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            .custom-popup-overlay.show { opacity: 1; }
            .custom-popup {
                background: white;
                border-radius: 12px;
                padding: 1.5rem;
                max-width: 400px;
                width: 100%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                transform: scale(0.8);
                transition: transform 0.3s ease;
            }
            .custom-popup-overlay.show .custom-popup { transform: scale(1); }
            .custom-popup-header {
                display: flex;
                align-items: center;
                margin-bottom: 1rem;
                gap: 0.5rem;
            }
            .custom-popup-icon { font-size: 1.5rem; }
            .custom-popup-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: #2c3e50;
                margin: 0;
            }
            .custom-popup-message {
                color: #555;
                margin-bottom: 1.5rem;
                line-height: 1.4;
            }
            .custom-popup-input {
                width: 100%;
                padding: 0.7rem;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 0.9rem;
                margin-bottom: 1rem;
                transition: border-color 0.2s ease;
                box-sizing: border-box;
            }
            .custom-popup-input:focus {
                outline: none;
                border-color: #3498db;
            }
            .custom-popup-buttons {
                display: flex;
                gap: 0.5rem;
                justify-content: flex-end;
            }
            .custom-popup-btn {
                padding: 0.7rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 0.9rem;
            }
            .custom-popup-btn.primary {
                background: #3498db;
                color: white;
            }
            .custom-popup-btn.primary:hover {
                background: #2980b9;
                transform: translateY(-1px);
            }
            .custom-popup-btn.secondary {
                background: #95a5a6;
                color: white;
            }
            .custom-popup-btn.secondary:hover {
                background: #7f8c8d;
                transform: translateY(-1px);
            }
        `;
    }

    /**
     * Retorna la estructura HTML del popup
     */
    getPopupHTML() {
        return `
            <div class="custom-popup">
                <div class="custom-popup-header">
                    <span id="custom-popup-icon" class="custom-popup-icon"></span>
                    <h3 id="custom-popup-title" class="custom-popup-title"></h3>
                </div>
                <div id="custom-popup-message" class="custom-popup-message"></div>
                <input type="text" id="custom-popup-input" class="custom-popup-input" style="display: none;">
                <div id="custom-popup-buttons" class="custom-popup-buttons"></div>
            </div>
        `;
    }

    /**
     * Muestra el overlay del popup
     */
    show(overlay) {
        if (!overlay) return;
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('show'), 10);
    }

    /**
     * Oculta el overlay del popup
     */
    hide(overlay) {
        if (!overlay) return;
        overlay.classList.remove('show');
        setTimeout(() => overlay.style.display = 'none', 300);
    }

    /**
     * Sanitiza texto para prevenir XSS
     */
    sanitizeText(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Crea botones de forma segura
     */
    createButton(text, className, action) {
        const button = document.createElement('button');
        button.className = `custom-popup-btn ${className}`;
        button.textContent = text;
        button.onclick = action;
        return button;
    }

    /**
     * Muestra un alert personalizado
     */
    customAlert(message, title = 'Información', icon = '💬') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-popup-overlay');
            if (!overlay) return resolve(true);
            
            const titleEl = document.getElementById('custom-popup-title');
            const iconEl = document.getElementById('custom-popup-icon');
            const messageEl = document.getElementById('custom-popup-message');
            const inputEl = document.getElementById('custom-popup-input');
            const buttonsEl = document.getElementById('custom-popup-buttons');

            if (titleEl) titleEl.textContent = this.sanitizeText(title);
            if (iconEl) iconEl.textContent = icon;
            if (messageEl) messageEl.textContent = this.sanitizeText(message);
            if (inputEl) inputEl.style.display = 'none';
            
            if (buttonsEl) {
                buttonsEl.innerHTML = '';
                const acceptBtn = this.createButton('Aceptar', 'primary', () => this.closeAlert());
                buttonsEl.appendChild(acceptBtn);
            }

            this.currentResolve = resolve;
            this.show(overlay);
        });
    }

    /**
     * Muestra un confirm personalizado
     */
    customConfirm(message, title = 'Confirmación', icon = '❓') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-popup-overlay');
            if (!overlay) return resolve(false);
            
            const titleEl = document.getElementById('custom-popup-title');
            const iconEl = document.getElementById('custom-popup-icon');
            const messageEl = document.getElementById('custom-popup-message');
            const inputEl = document.getElementById('custom-popup-input');
            const buttonsEl = document.getElementById('custom-popup-buttons');

            if (titleEl) titleEl.textContent = this.sanitizeText(title);
            if (iconEl) iconEl.textContent = icon;
            if (messageEl) messageEl.textContent = this.sanitizeText(message);
            if (inputEl) inputEl.style.display = 'none';
            
            if (buttonsEl) {
                buttonsEl.innerHTML = '';
                const cancelBtn = this.createButton('Cancelar', 'secondary', () => this.closeConfirm(false));
                const acceptBtn = this.createButton('Aceptar', 'primary', () => this.closeConfirm(true));
                buttonsEl.appendChild(cancelBtn);
                buttonsEl.appendChild(acceptBtn);
            }

            this.currentResolve = resolve;
            this.show(overlay);
        });
    }

    /**
     * Muestra un prompt personalizado
     */
    customPrompt(message, defaultValue = '', title = 'Ingresa información', icon = '✏️') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-popup-overlay');
            if (!overlay) return resolve(null);
            
            const titleEl = document.getElementById('custom-popup-title');
            const iconEl = document.getElementById('custom-popup-icon');
            const messageEl = document.getElementById('custom-popup-message');
            const inputEl = document.getElementById('custom-popup-input');
            const buttonsEl = document.getElementById('custom-popup-buttons');

            if (titleEl) titleEl.textContent = this.sanitizeText(title);
            if (iconEl) iconEl.textContent = icon;
            if (messageEl) messageEl.textContent = this.sanitizeText(message);
            if (inputEl) {
                inputEl.style.display = 'block';
                inputEl.value = this.sanitizeText(defaultValue);
            }
            
            if (buttonsEl) {
                buttonsEl.innerHTML = '';
                const cancelBtn = this.createButton('Cancelar', 'secondary', () => this.closePrompt(null));
                const acceptBtn = this.createButton('Aceptar', 'primary', () => {
                    const input = document.getElementById('custom-popup-input');
                    this.closePrompt(input ? input.value : null);
                });
                buttonsEl.appendChild(cancelBtn);
                buttonsEl.appendChild(acceptBtn);
            }

            this.currentResolve = resolve;
            this.show(overlay);
            
            if (inputEl) {
                setTimeout(() => {
                    try {
                        inputEl.focus();
                        inputEl.select();
                    } catch (e) {
                        console.warn('No se pudo enfocar el input');
                    }
                }, 350);
                
                inputEl.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        this.closePrompt(inputEl.value);
                    }
                };
            }
        });
    }

    /**
     * Cierra el alert
     */
    closeAlert() {
        const overlay = document.getElementById('custom-popup-overlay');
        if (overlay) this.hide(overlay);
        if (this.currentResolve) {
            this.currentResolve(true);
            this.currentResolve = null;
        }
    }

    /**
     * Cierra el confirm
     */
    closeConfirm(result) {
        const overlay = document.getElementById('custom-popup-overlay');
        if (overlay) this.hide(overlay);
        if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
        }
    }

    /**
     * Cierra el prompt
     */
    closePrompt(result) {
        const overlay = document.getElementById('custom-popup-overlay');
        if (overlay) this.hide(overlay);
        if (this.currentResolve) {
            this.currentResolve(result);
            this.currentResolve = null;
        }
    }
}

// Inicializar sistema de popups
const customPopups = new CustomPopups();

// Funciones globales
window.customAlert = (message, title, icon) => customPopups.customAlert(message, title, icon);
window.customConfirm = (message, title, icon) => customPopups.customConfirm(message, title, icon);
window.customPrompt = (message, defaultValue, title, icon) => customPopups.customPrompt(message, defaultValue, title, icon);

// Mantener funciones nativas
window.originalAlert = window.alert;
window.originalConfirm = window.confirm;
window.originalPrompt = window.prompt;
