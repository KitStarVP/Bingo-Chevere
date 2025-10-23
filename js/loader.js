// Loader unificado para navegación
class NavigationLoader {
    constructor() {
        this.currentPage = window.location.pathname.split('/').pop() || 'index.html';
        this.init();
    }

    init() {
        // Cargar navegación antigua si existe
        this.loadComponent('#nav-placeholder', 'nav.html', '.nav-item');
        // Cargar navegación nueva si existe
        this.loadComponent('#new-nav-placeholder', 'new-nav.html', '.new-nav-item');
    }

    loadComponent(selector, url, itemSelector) {
        const element = document.querySelector(selector);
        if (!element) return;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Could not fetch ${url}`);
                return response.text();
            })
            .then(html => {
                element.innerHTML = html;
                this.setActiveNavItem(itemSelector);
            })
            .catch(error => {
                console.error(`Error loading ${selector}:`, error);
                element.innerHTML = `<p style="color:red; text-align:center;">Error al cargar el menú.</p>`;
            });
    }

    setActiveNavItem(itemSelector) {
        const navItems = document.querySelectorAll(itemSelector);
        
        navItems.forEach(item => {
            const itemPage = item.getAttribute('href');
            item.classList.remove('active');
            if (itemPage === this.currentPage || (this.currentPage === 'index.html' && itemPage === '')) {
                item.classList.add('active');
            }
        });
    }
}

// Inicializar automáticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new NavigationLoader());
} else {
    new NavigationLoader();
}
