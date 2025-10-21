document.addEventListener('DOMContentLoaded', () => {
    const loadComponent = (selector, url) => {
        const element = document.querySelector(selector);
        if (element) {
            fetch(url)
                .then(response => {
                    if (response.ok) {
                        return response.text();
                    }
                    throw new Error(`Could not fetch ${url}`);
                })
                .then(html => {
                    element.innerHTML = html;
                    // After loading, set the active state based on the current page
                    setActiveNavItem();
                })
                .catch(error => {
                    console.error(`Error loading component into ${selector}:`, error);
                    element.innerHTML = `<p style="color:red; text-align:center;">Error al cargar el menú.</p>`;
                });
        }
    };

    const setActiveNavItem = () => {
        const currentPage = window.location.pathname.split('/').pop();
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const itemPage = item.getAttribute('href');
            item.classList.remove('active');
            if (itemPage === currentPage || (currentPage === '' && itemPage === 'index.html')) {
                item.classList.add('active');
            }
        });
    };

    // Load the navigation bar
    loadComponent('#nav-placeholder', 'nav.html');
});
