document.addEventListener('DOMContentLoaded', () => {
    const loadNewNav = (selector, url) => {
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
                    setActiveNewNavItem();
                })
                .catch(error => {
                    console.error(`Error loading component into ${selector}:`, error);
                });
        }
    };

    const setActiveNewNavItem = () => {
        const currentPage = window.location.pathname.split('/').pop();
        const navItems = document.querySelectorAll('.new-nav-item');
        
        navItems.forEach(item => {
            const itemPage = item.getAttribute('href');
            item.classList.remove('active');
            if (itemPage === currentPage || (currentPage === '' && itemPage === 'index.html')) {
                item.classList.add('active');
            }
        });
    };

    // Load the new navigation bar
    loadNewNav('#new-nav-placeholder', 'new-nav.html');
});